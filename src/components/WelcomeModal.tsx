import React, { useState } from 'react';
import { Modal, Button, Typography, Divider, Checkbox } from 'antd';
import { SmileOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Link } = Typography;

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, onClose, onAgree }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const steps = [
    {
      title: '感谢你来到 桌面收纳！',
      icon: <SmileOutlined style={{ fontSize: 24 }} />,
      content: (
        <div style={{ textAlign: 'left' }}>
          <Paragraph>
            欢迎使用 <strong>桌面收纳</strong>！
          </Paragraph>
          <Paragraph>
            桌面收纳是一个轻量级的桌面文件管理工具，帮助您整理和管理桌面上的文件，让您的桌面保持整洁有序。
          </Paragraph>
          <Paragraph>
            我们致力于为您提供简洁、高效的文件管理体验，让您的工作和生活更加轻松。
          </Paragraph>
          <Paragraph>
            您是桌面收纳的用户，亦是我们的朋友。若可以的话，请积极向我们提出您的建议以及在使用过程中遇到的问题。
          </Paragraph>
        </div>
      ),
      footer: (
        <Button type="primary" onClick={() => setCurrentStep(1)} style={{ width: '100%' }}>
          继续
        </Button>
      )
    },
    {
      title: '等等！还有一步！',
      icon: <CheckCircleOutlined style={{ fontSize: 24 }} />,
      content: (
        <div style={{ textAlign: 'left' }}>
          <Paragraph>
            在开始之前，请您充分阅读《使用协议》和《隐私政策》。为了保护您的相关权利，您还可以了解《知情权》。
          </Paragraph>
          <div style={{ margin: '16px 0' }}>
            <Link href="#" style={{ marginRight: '16px' }}>使用协议</Link>
            <Link href="#" style={{ marginRight: '16px' }}>隐私政策</Link>
            <Link href="#">知情权</Link>
          </div>
          <Checkbox 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: '16px' }}
          >
            我已阅读并同意以上协议和政策
          </Checkbox>
        </div>
      ),
      footer: (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={() => setCurrentStep(0)}>
            上一步
          </Button>
          <Button 
            type="primary" 
            onClick={onAgree} 
            disabled={!agreed}
          >
            同意并继续
          </Button>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={currentStepData.footer}
      width={500}
      centered
      closable={false}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          {currentStepData.icon}
        </div>
        <Title level={3} style={{ marginBottom: '16px' }}>
          {currentStepData.title}
        </Title>
      </div>
      <Divider />
      <div style={{ margin: '16px 0' }}>
        {currentStepData.content}
      </div>
    </Modal>
  );
};

export default WelcomeModal;