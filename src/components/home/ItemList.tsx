import React, { useState, useRef, useEffect } from "react";
import { useStore, type Item } from "../../store";
import ContextMenu from "../common/ContextMenu";
import { Modal, Input, Button, Form } from "antd";

interface FileIconProps {
  item: Item;
}

const { Search } = Input;

const FileIcon: React.FC<FileIconProps> = ({ item }) => {
  const [icon, setIcon] = useState<string | null>(null);

  useEffect(() => {
    // 对于 web 类型，直接使用 item.icon
    if (item.category === "web" && item.icon) {
      setIcon(item.icon);
    }
    // 对于 desktop 类型，自动获取图标
    else if (item.category === "desktop" && item.path && (item.type === "file" || item.type === "icon")) {
      window.electron
        .getFileIcon(item.path)
        .then((result: unknown) => {
          const iconResult = result as { success: boolean; icon?: string };
          if (iconResult.success && iconResult.icon) {
            setIcon(iconResult.icon);
          }
        })
        .catch(() => {});
    }
  }, [item.path, item.type, item.category, item.icon]);

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
          📄
        </div>
      );
  }
};

const ItemList: React.FC = () => {
  const {
    items,
    activeBoxId,
    incrementClickCount,
    sortByClickCount,
    reorderItems,
    addItem,
    addBox,
    setActiveBox,
    boxes,
  } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isAddLinkModalVisible, setIsAddLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkIcon, setLinkIcon] = useState<string | null>(null);
  const openingQueueRef = useRef<Item[]>([]);
  const activeCountRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const isOpeningRef = useRef(false);
  const isOpeningTimeoutRef = useRef<number | null>(null);

  const MAX_CONCURRENT_OPENS = 3;
  const OPEN_DELAY_MS = 300;
  const SORT_DELAY_MS = 500;

  useEffect(() => {
    if (window.electron?.window?.onVisibilityChange) {
      window.electron.window.onVisibilityChange((isVisible: boolean) => {
        setIsWindowVisible(isVisible);
      });
    }

    if (window.electron?.window?.isVisible) {
      window.electron.window.isVisible().then((isVisible: boolean) => {
        setIsWindowVisible(isVisible);
      });
    }
  }, []);

  const processQueue = () => {
    if (openingQueueRef.current.length === 0) {
      isOpeningRef.current = false;
      return;
    }

    if (activeCountRef.current < MAX_CONCURRENT_OPENS) {
      const nextItem = openingQueueRef.current.shift()!;
      activeCountRef.current++;
      forceUpdate((n) => n + 1);

      const itemPath = nextItem.category === 'web' ? nextItem.url : nextItem.path;
      if (itemPath) {
        window.electron.ipcRenderer.send("open-item", { path: itemPath });
      }

      setTimeout(() => {
        activeCountRef.current = Math.max(0, activeCountRef.current - 1);
        forceUpdate((n) => n + 1);
        processQueue();
      }, OPEN_DELAY_MS);
    }
  };

  const filteredItems = items
    .filter((item) => item.boxId === activeBoxId)
    .sort((a, b) => {
      if (!sortByClickCount) return 0;
      if (isOpeningRef.current || !isWindowVisible) return 0;
      if ((b.clickCount || 0) === (a.clickCount || 0)) return 0;
      return (b.clickCount || 0) - (a.clickCount || 0);
    });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleItemClick = (item: Item) => {
    const itemPath = item.category === 'web' ? item.url : item.path;
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

  const handleItemDoubleClick = (item: Item) => {
    const itemPath = item.category === 'web' ? item.url : item.path;
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

  const getActiveBoxId = (): string => {
    if (activeBoxId) {
      return activeBoxId;
    }
    if (boxes.length > 0) {
      const firstBox = boxes[0];
      setActiveBox(firstBox.id);
      return firstBox.id;
    }
    // 创建默认收纳盒
    addBox("默认收纳盒");
    // 等待收纳盒创建完成后，使用最后一个收纳盒作为活动收纳盒
    setTimeout(() => {
      if (boxes.length > 0) {
        const lastBox = boxes[boxes.length - 1];
        setActiveBox(lastBox.id);
      }
    }, 0);
    // 临时返回一个ID，实际使用时会更新
    return "temp";
  };

  const handleAddFileClick = async () => {
    // 先确保有活动的收纳盒
    if (!activeBoxId && boxes.length === 0) {
      addBox("默认收纳盒");
      // 等待收纳盒创建完成
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 使用HTML5的原生文件选择器
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) {
        console.log("[ItemList] 用户取消选择文件");
        return;
      }

      // 再次检查活动收纳盒
      let currentActiveBoxId = activeBoxId;
      if (!currentActiveBoxId) {
        if (boxes.length > 0) {
          currentActiveBoxId = boxes[0].id;
          setActiveBox(currentActiveBoxId);
        } else {
          console.error("[ItemList] 没有可用的收纳盒");
          return;
        }
      }

      // 处理每个选择的文件
      for (let i = 0; i < target.files.length; i++) {
        const file = target.files[i];
        // 注意：在浏览器环境中，我们只能获取到文件的名称，而不是完整路径
        // 但是在Electron环境中，我们可以通过webUtils.getPathForFile获取完整路径
        let filePath = file.name;

        // 尝试使用Electron的webUtils获取完整路径
        if (window.electron?.webUtils?.getPathForFile) {
          try {
            filePath = window.electron.webUtils.getPathForFile(file);
          } catch (error) {
            console.error("[ItemList] 获取文件路径失败:", error);
          }
        }

        addItem({
          name: file.name,
          category: "desktop",
          type: "file",
          path: filePath,
          boxId: currentActiveBoxId,
          clickCount: 0,
        });
      }
    };

    input.click();
  };

  const handleAddLinkClick = async () => {
    // 先确保有活动的收纳盒
    if (!activeBoxId && boxes.length === 0) {
      addBox("默认收纳盒");
      // 等待收纳盒创建完成
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 重置表单数据
    setLinkUrl("");
    setLinkName("");
    // 显示添加链接的模态框
    setIsAddLinkModalVisible(true);
  };

  // 获取网站图标（100% 可用，不跨域）
  const getWebsiteFavicon = async (url: string) => {
    try {
      const u = new URL(url);
      const host = u.hostname;
      // 免费公共服务，自动获取高清 favicon
      return `https://favicon.im/${host}`;

      // 备选方案（如果上面失效）
      // return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    } catch (e) {
      return "default-icon.png"; // 失败返回默认图标
    }
  };

  const onSearch = async (url: string) => {
    console.log(url);
    if (!url) return;

    setLinkLoading(true);
    try {
      // 获取网站图标
      const faviconUrl =await getWebsiteFavicon(url);
      setLinkIcon(`${faviconUrl}`);

      // 尝试使用Electron的主进程来获取网站信息
      if (window.electron?.ipcRenderer) {
        const siteInfo = await window.electron.ipcRenderer.invoke(
          "get-site-info",
          url,
        );
        if (siteInfo && siteInfo.title) {
          setLinkName(siteInfo.title);
        } else {
          // 如果主进程获取失败，回退到提取域名
          const domain = new URL(url).hostname;
          const siteName = domain.replace("www.", "");
          setLinkName(siteName);
        }
      } else {
        // 如果Electron API不可用，回退到提取域名
        const domain = new URL(url).hostname;
        const siteName = domain.replace("www.", "");
        setLinkName(siteName);
      }
    } catch (error) {
      console.error("[ItemList] 获取网站信息失败:", error);
      // 错误处理：回退到提取域名
      try {
        const domain = new URL(url).hostname;
        const siteName = domain.replace("www.", "");
        setLinkName(siteName);
        // 即使出错，也尝试获取图标
        getWebsiteFavicon(url).then(faviconUrl => {
          setLinkIcon(faviconUrl);
        });
      } catch (e) {
        console.error("[ItemList] 解析链接失败:", e);
      }
    } finally {
      setLinkLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl) return;

    // 验证是否已获取图标
    if (!linkIcon) {
      alert("请先点击'获取图标'按钮获取网站图标");
      return;
    }

    // 再次检查活动收纳盒
    let currentActiveBoxId = activeBoxId;
    if (!currentActiveBoxId) {
      if (boxes.length > 0) {
        currentActiveBoxId = boxes[0].id;
        setActiveBox(currentActiveBoxId);
      } else {
        console.error("[ItemList] 没有可用的收纳盒");
        return;
      }
    }

    // 添加链接
    addItem({
      name: linkName || linkUrl,
      category: "web",
      url: linkUrl,
      icon: linkIcon || undefined,
      boxId: currentActiveBoxId,
      clickCount: 0,
    });

    // 关闭模态框
    setIsAddLinkModalVisible(false);
    setLinkIcon("");
    setLinkName("");
  };

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    if (sortByClickCount) return;
    e.dataTransfer.setData("text/plain", item.id);
    setDraggedItem(item);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    if (sortByClickCount) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDropItem = (e: React.DragEvent, dropIndex: number) => {
    if (sortByClickCount) return;
    e.preventDefault();

    const draggedItemId = e.dataTransfer.getData("text/plain");
    const draggedIndex = filteredItems.findIndex(
      (item) => item.id === draggedItemId,
    );

    if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
      reorderItems(draggedIndex, dropIndex);
    }

    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  return (
    <div className="grid-wrap">
      <div
        className="grid"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {filteredItems.length === 0 && !isDragOver ? (
          <>
            <div
              className="add-slot"
              onClick={handleAddFileClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="add-slot-ico">+</div>
              <div className="add-slot-txt">添加文件</div>
            </div>
            <div
              className="add-slot"
              onClick={handleAddLinkClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="add-slot-ico">🔗</div>
              <div className="add-slot-txt">添加链接</div>
            </div>
          </>
        ) : (
          filteredItems.map((item, index) => (
            <ContextMenu key={item.id} type="item" data={item}>
              <div
                className={`item ${dragOverIndex === index ? "drag-over" : ""} ${draggedItem?.id === item.id ? "dragging" : ""}`}
                onClick={() => handleItemClick(item)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleDragOverItem(e, index)}
                onDrop={(e) => handleDropItem(e, index)}
                onDragEnd={handleDragEnd}
                draggable={!sortByClickCount}
                onDragLeave={handleDragLeave}
              >
                <FileIcon item={item} />
                <div className="item-nm">{item.name}</div>
              </div>
            </ContextMenu>
          ))
        )}

        {filteredItems.length > 0 && (
          <>
            <div
              className="add-slot"
              onClick={handleAddFileClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="add-slot-ico">+</div>
              <div className="add-slot-txt">添加文件</div>
            </div>
            <div
              className="add-slot"
              onClick={handleAddLinkClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="add-slot-ico">🔗</div>
              <div className="add-slot-txt">添加链接</div>
            </div>
          </>
        )}
      </div>

      {/* 添加链接的模态框 */}
      <Modal
        title="添加链接"
        open={isAddLinkModalVisible}
        onOk={handleAddLink}
        onCancel={() => {
          setIsAddLinkModalVisible(false);
          setLinkIcon("");
          setLinkName("");
        }}
        okText="确认"
        cancelText="取消"
        width={400}
      >
        <Form layout="vertical">
          <Form.Item
            label="网页链接"
            rules={[
              { required: true, message: "请输入网页链接" },
              { type: "url", message: "请输入有效的URL地址" },
            ]}
          >
            <Search
              value={linkUrl}
              placeholder="请输入网页链接"
              enterButton="获取图标"
              onSearch={onSearch}
              loading={linkLoading}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="链接图标">
            {linkIcon ? (
              <div style={{ display: "flex", alignItems: "center" }}>
                <img
                  src={linkIcon}
                  alt="网站图标"
                  style={{ width: 48, height: 48, marginRight: 16 }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: "#f0f0f0",
                  borderRadius: 4,
                }}
              ></div>
            )}
          </Form.Item>
          <Form.Item label="链接名称">
            <Input
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="请输入链接名称（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ItemList;
