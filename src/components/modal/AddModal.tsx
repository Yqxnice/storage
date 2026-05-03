import React from 'react';
import { CustomModal } from '../common';

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  onAddFile: () => void;
  onAddFolder: () => void;
  onAddLink: () => void;
}

const AddModal: React.FC<AddModalProps> = ({ visible, onClose, onAddFile, onAddFolder, onAddLink }) => {
  return (
    <CustomModal
      title="添加"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={300}
    >
      <div style={{ padding: "20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 0",
            cursor: "pointer",
            borderRadius: "4px",
            paddingLeft: "16px",
            paddingRight: "16px"
          }}
          onClick={() => {
            onClose();
            onAddFile();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div style={{ fontSize: "20px", marginRight: "16px" }}>+</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "500" }}>添加文件</div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>选择本地文件添加到收纳盒</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 0",
            cursor: "pointer",
            borderRadius: "4px",
            paddingLeft: "16px",
            paddingRight: "16px"
          }}
          onClick={() => {
            onClose();
            onAddFolder();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div style={{ fontSize: "20px", marginRight: "16px" }}>📁</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "500" }}>添加文件夹</div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>选择本地文件夹添加到收纳盒</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 0",
            cursor: "pointer",
            borderRadius: "4px",
            paddingLeft: "16px",
            paddingRight: "16px"
          }}
          onClick={() => {
            onClose();
            onAddLink();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div style={{ fontSize: "20px", marginRight: "16px" }}>🔗</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "500" }}>添加链接</div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>添加网页链接到收纳盒</div>
          </div>
        </div>
      </div>
    </CustomModal>
  );
};

export default AddModal;