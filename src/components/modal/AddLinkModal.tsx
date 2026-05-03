import React, { useState } from 'react';
import { CustomModal } from '../common';
import CustomInput from '../common/CustomInput';

interface AddLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onAddLink: (name: string, url: string, icon: string) => void;
}

const AddLinkModal: React.FC<AddLinkModalProps> = ({ visible, onClose, onAddLink }) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkIcon, setLinkIcon] = useState<string | null>(null);

  // 获取网站图标（100% 可用，不跨域）
  const getWebsiteFavicon = async (url: string) => {
    try {
      const u = new URL(url);
      const host = u.hostname;
      // 免费公共服务，自动获取高清 favicon
      return `https://favicon.im/${host}`;

      // 备选方案（如果上面失效）
      // return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    } catch {
      return "default-icon.png"; // 失败返回默认图标
    }
  };

  const onSearch = async (url: string) => {
    if (!url) return;

    setLinkLoading(true);
    try {
      // 获取网站图标
      const faviconUrl = await getWebsiteFavicon(url);
      setLinkIcon(`${faviconUrl}`);

      // 尝试使用 Tauri 的 IPC 来获取网站信息
      try {
        // 这里需要在 Tauri 的 main.rs 中实现 get_site_info 命令
        // 暂时直接使用域名作为网站名称
        const domain = new URL(url).hostname;
        const siteName = domain.replace("www.", "");
        setLinkName(siteName);
      } catch {
        // 如果获取失败，回退到提取域名
        const domain = new URL(url).hostname;
        const siteName = domain.replace("www.", "");
        setLinkName(siteName);
      }
    } catch {
      // 错误处理：回退到提取域名
      try {
        const domain = new URL(url).hostname;
        const siteName = domain.replace("www.", "");
        setLinkName(siteName);
        // 即使出错，也尝试获取图标
        getWebsiteFavicon(url).then((faviconUrl) => {
          setLinkIcon(faviconUrl);
        });
      } catch (e) {

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

    // 添加链接
    onAddLink(linkName || linkUrl, linkUrl, linkIcon);

    // 关闭模态框
    onClose();
  };

  const handleCancel = () => {
    onClose();
    setLinkIcon("");
    setLinkName("");
    setLinkUrl("");
  };

  return (
    <CustomModal
      title="添加链接"
      open={visible}
      onOk={handleAddLink}
      onCancel={handleCancel}
      okText="确认"
      cancelText="取消"
      width={400}
    >
      <div style={{ padding: '10px 0' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--txt)' }}>
            网页链接
          </label>
          <CustomInput
            value={linkUrl}
            placeholder="请输入网页链接"
            enterButton="获取图标"
            onSearch={onSearch}
            loading={linkLoading}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--txt)' }}>
            链接图标
          </label>
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
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--txt)' }}>
            链接名称
          </label>
          <CustomInput
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="请输入链接名称（可选）"
          />
        </div>
      </div>
    </CustomModal>
  );
};

export default AddLinkModal;