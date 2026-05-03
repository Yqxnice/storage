import React, { useEffect, useState } from 'react';

type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface MessageInstance {
  id: number;
  content: string;
  type: MessageType;
  duration: number;
}

let messageCallback: ((options: { content: string; type: MessageType; duration?: number }) => void) | null = null;

export const showMessage = (options: { content: string; type: MessageType; duration?: number }) => {
  if (messageCallback) {
    messageCallback(options);
  }
};

showMessage.success = (content: string, duration = 3000) => {
  showMessage({ content, type: 'success', duration });
};

showMessage.error = (content: string, duration = 3000) => {
  showMessage({ content, type: 'error', duration });
};

showMessage.warning = (content: string, duration = 3000) => {
  showMessage({ content, type: 'warning', duration });
};

showMessage.info = (content: string, duration = 3000) => {
  showMessage({ content, type: 'info', duration });
};

showMessage.loading = (content: string, duration = 0) => {
  showMessage({ content, type: 'loading', duration });
};

interface MessageProviderProps {
  children?: React.ReactNode;
}

const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<MessageInstance[]>([]);

  useEffect(() => {
    messageCallback = (options) => {
      const id = Date.now() + Math.random();
      const newMessage: MessageInstance = {
        id,
        content: options.content,
        type: options.type,
        duration: options.duration || 3000
      };

      setMessages(prev => [...prev, newMessage]);

      if (newMessage.duration > 0) {
        setTimeout(() => {
          setMessages(prev => prev.filter(msg => msg.id !== id));
        }, newMessage.duration);
      }
    };

    return () => {
      messageCallback = null;
    };
  }, []);

  const removeMessage = (id: number) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const getTypeStyles = (type: MessageType) => {
    switch (type) {
      case 'success':
        return { bg: '#52c41a', icon: '✓' };
      case 'error':
        return { bg: '#ff4d4f', icon: '✕' };
      case 'warning':
        return { bg: '#faad14', icon: '⚠' };
      case 'info':
        return { bg: '#1890ff', icon: 'ℹ' };
      case 'loading':
        return { bg: '#1890ff', icon: '↻' };
      default:
        return { bg: '#1890ff', icon: 'ℹ' };
    }
  };

  return (
    <>
      {children}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none'
      }}>
        {messages.map(msg => {
          const styles = getTypeStyles(msg.type);
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                backgroundColor: 'var(--surface)',
                border: `1px solid ${styles.bg}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                animation: 'slideIn 0.3s ease-out',
                pointerEvents: 'auto',
                maxWidth: '400px'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: styles.bg,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                animation: msg.type === 'loading' ? 'spin 1s linear infinite' : 'none'
              }}>
                {styles.icon}
              </div>
              <div style={{
                color: 'var(--txt)',
                fontSize: '14px',
                lineHeight: 1.5
              }}>
                {msg.content}
              </div>
              {msg.duration === 0 && (
                <button
                  onClick={() => removeMessage(msg.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--txt2)',
                    cursor: 'pointer',
                    padding: '0',
                    marginLeft: '8px',
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default MessageProvider;
