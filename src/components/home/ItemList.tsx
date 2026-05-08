import React, { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "../../store";
import type { Item } from "../../types";
import ContextMenu from "../common/ContextMenu";
import AddModal from "../modal/AddModal";
import AddLinkModal from "../modal/AddLinkModal";
import { tauriIPC } from "../../utils/tauri-ipc";
import { useSortable } from "../../hooks";
import { BOX_FLOAT_ITEMS_RELOAD } from "../../utils/box-float-notify";
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { storageManager } from "../../utils/storage-manager";

interface FileIconProps {
  item: Item;
}

/**
 * 文件图标组件
 * 根据项目类型和类别显示不同的图标
 * @param item 项目对象
 */
const FileIcon: React.FC<FileIconProps> = ({ item }) => {
  const [systemIcon, setSystemIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadIcon = async () => {
      if (item.category === "desktop" && item.path) {
        try {
          const icon = await tauriIPC.getFileIcon(item.path);
          if (icon && icon !== "default-icon") {
            setSystemIcon(icon);
          }
        } catch (error) {
          console.error("Failed to get file icon:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadIcon();
  }, [item.path, item.category]);

  const icon = item.category === "web" && item.icon ? item.icon : systemIcon;

  if (icon) {
    return (
      <div className="item-ico" style={{ background: "var(--accent-bg)" }}>
        <img
          src={icon}
          alt=""
          style={{ width: 28, height: 28, objectFit: "contain" }}
        />
      </div>
    );
  }

  if (item.category === "web") {
    return (
      <div className="item-ico" style={{ background: "var(--accent-bg)" }}>
        🔗
      </div>
    );
  }

  switch (item.type) {
    case "folder":
      return (
        <div className="item-ico" style={{ background: "var(--green-bg)" }}>
          📁
        </div>
      );
    case "icon":
      return (
        <div className="item-ico" style={{ background: "var(--accent-bg)" }}>
          🔗
        </div>
      );
    default:
      return (
        <div className="item-ico" style={{ background: "var(--amber-bg)" }}>
          {isLoading ? "..." : "📄"}
        </div>
      );
  }
};

const ItemList: React.FC = () => {
  const {
    items,
    activeBoxId,
    incrementClickCount,
    addItem,
    addBox,
    setActiveBox,
    boxes,
    syncStorageFromTauriStore,
  } = useStore();

  // 辅助函数：去掉文件后缀
  const removeFileExtension = (name: string, type?: string) => {
    // 如果是文件夹，直接返回
    if (type === "folder") return name;
    // 去掉后缀（只去掉最后一个点后面的部分）
    const lastDotIndex = name.lastIndexOf(".");
    if (lastDotIndex > 0) {
      return name.substring(0, lastDotIndex);
    }
    return name;
  };

  const [isAddLinkModalVisible, setIsAddLinkModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const openingQueueRef = useRef<Item[]>([]);
  const activeCountRef = useRef(0);

  const isOpeningRef = useRef(false);
  const isOpeningTimeoutRef = useRef<number | null>(null);

  const MAX_CONCURRENT_OPENS = 3;
  const OPEN_DELAY_MS = 300;
  const SORT_DELAY_MS = 500;

  useEffect(() => {
    const handleItemsReload = async (event: { payload: { boxId?: string } }) => {
      const { boxId } = event.payload;
      if (boxId && boxId === activeBoxId) {
        try {
          await storageManager.syncFromBackend();
          const raw = storageManager.getState();
          syncStorageFromTauriStore(raw);
        } catch (error) {
          console.error('[ItemList] 重新加载数据失败:', error);
        }
      }
    };

    const unlisten1 = listen(BOX_FLOAT_ITEMS_RELOAD, handleItemsReload);

    return () => {
      unlisten1.then(fn => fn()).catch(console.error);
    };
  }, [activeBoxId, syncStorageFromTauriStore]);

  /**
   * 处理项目打开队列
   * 控制并发打开项目的数量，避免系统资源占用过高
   */
  const processQueue = useCallback(() => {
    if (openingQueueRef.current.length === 0) {
      isOpeningRef.current = false;
      return;
    }

    if (activeCountRef.current < MAX_CONCURRENT_OPENS) {
      const nextItem = openingQueueRef.current.shift()!;
      activeCountRef.current++;

      const itemPath =
        nextItem.category === "web" ? nextItem.url : nextItem.path;

      if (itemPath) {
        // 使用 Tauri 的 openItem 方法打开文件或链接
        tauriIPC.openItem(itemPath).catch((error) => {
          console.error('打开项目失败:', error);
        });
      }

      setTimeout(() => {
        activeCountRef.current = Math.max(0, activeCountRef.current - 1);
        processQueue();
      }, OPEN_DELAY_MS);
    }
  }, []);

  const filteredItems = items
    .filter((item) => item.boxId === activeBoxId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    if (activeBoxId) {
      await storageManager.update({
        type: 'reorderItems',
        payload: { boxId: activeBoxId, fromIndex, toIndex }
      })
      await invoke('emit_float_items_reload', { boxId: activeBoxId })
    }
  }, [activeBoxId]);

  const { containerRef } = useSortable({
    onReorder: handleReorder,
    enabled: true,
  });

  /**
   * 处理项目点击/双击
   * 打开项目并增加点击次数，添加到打开队列中
   * @param item 项目对象
   */
  const handleItemInteraction = (item: Item) => {
    const itemPath = item.category === "web" ? item.url : item.path;
    if (itemPath) {
      isOpeningRef.current = true;
      if (isOpeningTimeoutRef.current) {
        clearTimeout(isOpeningTimeoutRef.current);
      }
      isOpeningTimeoutRef.current = window.setTimeout(() => {
        isOpeningRef.current = false;
      }, SORT_DELAY_MS);
      incrementClickCount(item.id);
      openingQueueRef.current.push(item);
      processQueue();
    }
  };

  /**
   * 处理添加文件/文件夹
   * 打开文件选择器，选择文件或文件夹并添加到当前收纳盒
   * @param isFolder 是否添加文件夹
   */
  const handleAddItemClick = async (isFolder: boolean = false) => {
    // 1. 确保收纳盒逻辑不变
    if (!activeBoxId && boxes.length === 0) {
      addBox("默认收纳盒");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const currentActiveBoxId = activeBoxId || boxes[0]?.id;
    if (!currentActiveBoxId) {
      return;
    }

    // 2. 使用Tauri的文件选择API
    try {
      // 动态导入@tauri-apps/plugin-dialog
      const { open } = await import("@tauri-apps/plugin-dialog");

      // 打开文件选择器
      const filePaths = await open({
        multiple: true,
        title: isFolder ? "选择文件夹" : "选择文件",
        directory: isFolder,
        filters: [
          {
            name: isFolder ? "所有文件夹" : "所有文件",
            extensions: ["*"],
          },
        ],
      });

      // 用户取消选择
      if (!filePaths) {
        return;
      }

      // 处理选择的文件路径
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

      // 3. 批量添加Item
      for (const fullFilePath of paths) {
        const fileName = fullFilePath.split(/[\\/]/).pop() || "未知文件";
        
        // 获取文件或文件夹大小
        let fileSize: number | undefined;
        fileSize = await tauriIPC.getFileSize(fullFilePath);

        await addItem({
          name: fileName,
          category: "desktop",
          type: isFolder ? "folder" : "file",
          path: fullFilePath,
          boxId: currentActiveBoxId,
          clickCount: 0,
          size: fileSize,
        });
      }
    } catch (error) {
      console.error('添加文件失败:', error);
    }
  };

  /**
   * 处理添加链接
   * 显示添加链接的模态框
   */
  const handleAddLinkClick = async () => {
    // 先确保有活动的收纳盒
    if (!activeBoxId && boxes.length === 0) {
      addBox("默认收纳盒");
      // 等待收纳盒创建完成
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 显示添加链接的模态框
    setIsAddLinkModalVisible(true);
  };

  /**
   * 处理添加链接的确认
   * 将链接添加到当前收纳盒
   * @param name 链接名称
   * @param url 链接URL
   * @param icon 链接图标
   */
  const handleAddLink = async (name: string, url: string, icon: string) => {
    // 再次检查活动收纳盒
    let currentActiveBoxId = activeBoxId;
    if (!currentActiveBoxId) {
      if (boxes.length > 0) {
        currentActiveBoxId = boxes[0].id;
        setActiveBox(currentActiveBoxId);
      } else {
        return;
      }
    }

    // 添加链接
    addItem({
      name: name,
      category: "web",
      url: url,
      icon: icon || undefined,
      boxId: currentActiveBoxId,
      clickCount: 0,
    });

    // 关闭模态框
    setIsAddLinkModalVisible(false);
  };

  return (
    <div className="grid-wrap">
      <div
        ref={containerRef}
        className="grid allow-right-click"
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        {filteredItems.map((item) => (
          <ContextMenu key={item.id} type="item" data={item}>
            <div
              className="item"
              onClick={() => handleItemInteraction(item)}
              onDoubleClick={() => handleItemInteraction(item)}
            >
              <FileIcon item={item} />
              <div className="item-nm">
                {removeFileExtension(item.name, item.type)}
              </div>
            </div>
          </ContextMenu>
        ))}

        <div
          className="add-slot"
          onClick={() => setIsAddModalVisible(true)}
        >
          <div className="add-slot-ico">+</div>
          <div className="add-slot-txt">添加</div>
        </div>
      </div>

      {/* 添加选项的模态框 */}
      <AddModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAddFile={() => handleAddItemClick(false)}
        onAddFolder={() => handleAddItemClick(true)}
        onAddLink={handleAddLinkClick}
      />

      {/* 添加链接的模态框 */}
      <AddLinkModal
        visible={isAddLinkModalVisible}
        onClose={() => setIsAddLinkModalVisible(false)}
        onAddLink={handleAddLink}
      />


    </div>
  );
};

export default ItemList;
