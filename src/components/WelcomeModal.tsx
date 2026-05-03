import React, { useState } from 'react';
import { CustomModal, CustomButton, CustomCheckbox, CustomDivider } from './common';
import { AiOutlineSmile, AiOutlineCheckCircle } from 'react-icons/ai';

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
      icon: <AiOutlineSmile style={{ fontSize: 24 }} />,
      content: (
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.6 }}>
            欢迎使用 <strong>桌面收纳</strong>！
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.6 }}>
            桌面收纳是一个轻量级的桌面文件管理工具，帮助您整理和管理桌面上的文件，让您的桌面保持整洁有序。
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.6 }}>
            我们致力于为您提供简洁、高效的文件管理体验，让您的工作和生活更加轻松。
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.6 }}>
            您是桌面收纳的用户，亦是我们的朋友。若可以的话，请积极向我们提出您的建议以及在使用过程中遇到的问题。
          </p>
        </div>
      ),
      footer: (
        <CustomButton type="primary" onClick={() => setCurrentStep(1)} style={{ width: '100%' }}>
          继续
        </CustomButton>
      )
    },
    {
      title: '等等！还有一步！',
      icon: <AiOutlineCheckCircle style={{ fontSize: 24 }} />,
      content: (
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.6 }}>
            在开始之前，请您充分阅读《使用协议》和《隐私政策》。为了保护您的相关权利，您还可以了解《知情权》。
          </p>
          <div style={{ margin: '16px 0' }}>
            <a href="#" style={{ marginRight: '16px', color: 'var(--accent)', textDecoration: 'none' }}>使用协议</a>
            <a href="#" style={{ marginRight: '16px', color: 'var(--accent)', textDecoration: 'none' }}>隐私政策</a>
            <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>知情权</a>
          </div>
          <CustomCheckbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: '16px' }}
          >
            我已阅读并同意以上协议和政策
          </CustomCheckbox>
        </div>
      ),
      footer: (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <CustomButton onClick={() => setCurrentStep(0)}>
            上一步
          </CustomButton>
          <CustomButton
            type="primary"
            onClick={onAgree}
            disabled={!agreed}
          >
            同意并继续
          </CustomButton>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <CustomModal
      open={visible}
      onCancel={onClose}
      footer={currentStepData.footer}
      width={500}
      centered
      closable={false}
      mask={{ closable: false }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          {currentStepData.icon}
        </div>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--txt)' }}>
          {currentStepData.title}
        </h3>
      </div>
      <CustomDivider />
      <div style={{ margin: '16px 0' }}>
        {currentStepData.content}
      </div>
    </CustomModal>
  );
};

export default WelcomeModal;