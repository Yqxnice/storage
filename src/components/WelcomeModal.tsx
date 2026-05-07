import React, { useState } from 'react';
import { CustomModal, CustomButton, CustomCheckbox} from './common';
import { APP_INFO } from '../constants';
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
      title: `欢迎使用${APP_INFO.NAME}`,
      icon: <AiOutlineSmile style={{ fontSize: 48, color: 'var(--accent)' }} />,
      content: (
        <div style={{ textAlign: 'left', padding: '0 8px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.7 }}>
            {APP_INFO.NAME}帮您轻松整理桌面文件，打造整洁有序的工作空间。
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.7 }}>
            {APP_INFO.TAGLINE}，安全高效管理您的桌面。
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: 'var(--txt2)', lineHeight: 1.7 }}>
            有任何建议或问题，欢迎随时反馈。
          </p>
        </div>
      ),
      footer: (
        <CustomButton 
          type="primary" 
          onClick={() => setCurrentStep(1)} 
          size="large"
          style={{ width: '100%', borderRadius: '8px', padding: '10px 24px', fontSize: '14px' }}
        >
          继续
        </CustomButton>
      )
    },
    {
      title: '同意协议',
      icon: <AiOutlineCheckCircle style={{ fontSize: 48, color: '#52c41a' }} />,
      content: (
        <div style={{ textAlign: 'left', padding: '0 8px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--txt)', lineHeight: 1.6 }}>
            请阅读并同意以下协议：
          </p>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#40a9ff'}>
              使用协议
            </a>
            <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#40a9ff'}>
              隐私政策
            </a>
            <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#40a9ff'}>
              知情权
            </a>
          </div>
          <CustomCheckbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          >
            我已阅读并同意上述协议
          </CustomCheckbox>
        </div>
      ),
      footer: (
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <CustomButton
            onClick={() => setCurrentStep(0)}
            style={{ flex: 1, borderRadius: '8px', padding: '10px' }}
          >
            返回
          </CustomButton>
          <CustomButton
            type="primary"
            onClick={onAgree}
            disabled={!agreed}
            style={{ flex: 1, borderRadius: '8px', padding: '10px' }}
          >
            同意并开始
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
      width={480}
      centered
      closable={false}
      mask={{ closable: false }}
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ marginBottom: '12px', animation: 'fadeInUp 0.4s ease-out' }}>
          {currentStepData.icon}
        </div>
        <h3 style={{ 
          margin: 0,
          fontSize: '20px', 
          fontWeight: 600, 
          color: 'var(--txt)',
          animation: 'fadeInUp 0.4s ease-out 0.1s both'
        }}>
          {currentStepData.title}
        </h3>
      </div>
      <div style={{ padding: '0 24px 20px' }}>
        {currentStepData.content}
      </div>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </CustomModal>
  );
};

export default WelcomeModal;