import { MessageOutlined, SendOutlined, CloseOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { FloatButton, Badge, Modal, Input, Button } from 'antd';
import React, { useState, useRef, useEffect } from 'react';

const { TextArea } = Input;

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface FloatMessageButtonProps {
  /** 未读消息数量 */
  count?: number;
  /** 点击回调 */
  onClick?: () => void;
}

const FloatMessageButton: React.FC<FloatMessageButtonProps> = ({
  count = 0,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (modalOpen) {
      scrollToBottom();
    }
  }, [messages, modalOpen]);

  const handleOpen = () => {
    setModalOpen(true);
    onClick?.();
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '这是一条自动回复消息。你可以在这里集成实际的聊天 API。',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 消息项组件
  const MessageItem = ({ message }: { message: Message }) => {
    const isUser = message.sender === 'user';
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          padding: '8px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            gap: 12,
            maxWidth: '70%',
          }}
        >
          {/* 头像 */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: isUser ? '#1677ff' : '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isUser ? (
              <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
            ) : (
              <RobotOutlined style={{ color: '#1677ff', fontSize: 16 }} />
            )}
          </div>
          {/* 消息内容 */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              backgroundColor: isUser ? '#1677ff' : '#f0f0f0',
              color: isUser ? '#fff' : '#1a1a1a',
              fontSize: 15,
              lineHeight: 1.6,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  };

  // 加载动画
  const LoadingDots = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        padding: '8px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          maxWidth: '70%',
        }}
      >
        {/* 头像 */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <RobotOutlined style={{ color: '#1677ff', fontSize: 16 }} />
        </div>
        {/* 加载动画 */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#8e8ea0',
              animation: 'bounce 1.4s infinite ease-in-out both',
              animationDelay: '0s',
            }}
          />
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#8e8ea0',
              animation: 'bounce 1.4s infinite ease-in-out both',
              animationDelay: '0.16s',
            }}
          />
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#8e8ea0',
              animation: 'bounce 1.4s infinite ease-in-out both',
              animationDelay: '0.32s',
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>

      <Badge count={count} offset={[-6, 6]} size="small">
        <FloatButton
          icon={<MessageOutlined />}
          type={isHovered ? 'primary' : 'default'}
          onClick={handleOpen}
          style={{
            position: 'fixed',
            right: 40,
            bottom: 40,
            width: 48,
            height: 48,
            zIndex: 1000,
            boxShadow: isHovered
              ? '0 6px 16px 0 rgba(0, 0, 0, 0.2)'
              : '0 2px 8px 0 rgba(0, 0, 0, 0.15)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
      </Badge>

      <Modal
        open={modalOpen}
        onCancel={handleClose}
        footer={null}
        closable={false}
        width="100vw"
        style={{
          top: 0,
          padding: 0,
          maxWidth: '100vw',
          margin: 0,
        }}
        styles={{
          body: {
            padding: 0,
            height: '100vh',
          },
          content: {
            borderRadius: 0,
            padding: 0,
          },
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#fff',
          }}
        >
          {/* 顶部栏 */}
          <div
            style={{
              height: 56,
              borderBottom: '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              backgroundColor: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  backgroundColor: '#1677ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
                智能助手
              </span>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined style={{ fontSize: 16 }} />}
              onClick={handleClose}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b6b6b',
              }}
            />
          </div>

          {/* 消息区域 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: '#fff',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b6b6b',
                  padding: 24,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    backgroundColor: '#1677ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24,
                  }}
                >
                  <RobotOutlined style={{ color: '#fff', fontSize: 32 }} />
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    marginBottom: 8,
                  }}
                >
                  有什么可以帮您？
                </div>
                <div style={{ fontSize: 14, color: '#8e8ea0' }}>
                  请在下方输入您的问题
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 15%' }}>
                {messages.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))}
                {loading && <LoadingDots />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div
            style={{
              borderTop: '1px solid #e5e5e5',
              backgroundColor: '#fff',
              padding: '16px 0 24px',
            }}
          >
            <div
              style={{
                maxWidth: 768,
                margin: '0 auto',
                padding: '0 24px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  border: '1px solid #d9d9d9',
                  borderRadius: 12,
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 0 transparent',
                  transition: 'all 0.2s',
                }}
              >
                <TextArea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="发送消息..."
                  autoSize={{ minRows: 1, maxRows: 6 }}
                  disabled={loading}
                  style={{
                    border: 'none',
                    resize: 'none',
                    padding: '12px 48px 12px 16px',
                    fontSize: 15,
                    lineHeight: 1.5,
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                  }}
                />
                <Button
                  type="text"
                  icon={
                    <SendOutlined
                      style={{
                        fontSize: 18,
                        color: inputValue.trim() && !loading ? '#1677ff' : '#d9d9d9',
                      }}
                    />
                  }
                  onClick={handleSend}
                  disabled={!inputValue.trim() || loading}
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    backgroundColor: 'transparent',
                  }}
                />
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#8e8ea0',
                  marginTop: 12,
                }}
              >
                按 Enter 发送，Shift + Enter 换行
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default FloatMessageButton;
