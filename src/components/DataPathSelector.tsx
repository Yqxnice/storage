import React, { useState } from 'react';
import { Modal, Select, Form, Typography } from 'antd';

const { Paragraph } = Typography;

interface DataPathSelectorProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
}

const DataPathSelector: React.FC<DataPathSelectorProps> = ({ visible, onClose, onConfirm }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      const selectedOption = values.dataLocation;
      
      setLoading(true);
      
      // 根据选择的选项确定路径
      let dataPath = '';
      if (selectedOption === 'appdata') {
        // AppData 路径由主进程处理
        dataPath = 'appdata';
      } else if (selectedOption === 'current') {
        // 当前目录路径由主进程处理
        dataPath = 'current';
      }
      
      onConfirm(dataPath);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="您的数据选择"
      open={visible}
      onOk={handleConfirm}
      onCancel={handleCancel}
      okText="继续"
      cancelText="取消"
      okButtonProps={{ loading }}
      width={500}
      closable={false}
    >
      <div style={{ padding: '10px 0' }}>
        <Paragraph style={{ marginBottom: '16px' }}>
          请选择桌面收纳存储用户数据的位置。
        </Paragraph>
        <Paragraph style={{ marginBottom: '16px' }}>
          您可以稍后在设置中查看用户数据或清除(或重新选择)。
        </Paragraph>
        
        <Form form={form} layout="vertical">
          <Form.Item
            name="dataLocation"
            rules={[{ required: true, message: '请选择数据存储位置' }]}
            initialValue="appdata"
          >
            <Select style={{ width: '100%' }} placeholder="请选择数据存储位置">
              <Select.Option value="appdata">AppData</Select.Option>
              <Select.Option value="current">当前目录</Select.Option>
            </Select>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <Paragraph style={{ marginBottom: '8px', fontSize: '14px' }}>
            <strong>AppData：</strong> 数据将存放在与用户关联的 AppData 文件夹中，对数据互通更友好，适合一般使用场景。
          </Paragraph>
          <Paragraph style={{ fontSize: '14px' }}>
            <strong>当前目录：</strong> 数据将存放在应用当前目录中，适合便携式使用体验。
          </Paragraph>
        </div>
      </div>
    </Modal>
  );
};

export default DataPathSelector;