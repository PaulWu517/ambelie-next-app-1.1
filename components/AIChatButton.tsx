'use client';

import React, { useState } from 'react';
import AIChatBot from './AIChatBot';
import styles from './AIChatButton.module.css';

const AIChatButton: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(true); // 模拟有新消息提示

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setHasNewMessage(false); // 打开聊天时清除新消息提示
    }
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 浮动聊天按钮 */}
      <div className={styles.chatButtonContainer}>
        <button
          className={`${styles.chatButton} ${isChatOpen ? styles.active : ''}`}
          onClick={handleToggleChat}
          aria-label="Open AI Chat"
          title="AI Assistant"
        >
          {/* 新消息提示点 */}
          {hasNewMessage && !isChatOpen && (
            <div className={styles.notificationDot}></div>
          )}
          
          {/* 按钮图标 */}
          <div className={styles.buttonIcon}>
            {isChatOpen ? (
              <span className={styles.closeIcon}>✕</span>
            ) : (
              <span className={styles.chatIcon}>💬</span>
            )}
          </div>
          
          {/* 按钮文字 */}
          <div className={styles.buttonText}>
            {isChatOpen ? 'Close Chat' : 'AI Assistant'}
          </div>
        </button>
        
        {/* 欢迎气泡提示 */}
        {!isChatOpen && hasNewMessage && (
          <div className={styles.welcomeBubble}>
          <div className={styles.bubbleContent}>
            <p>👋 Hello! I'm AMBELIE AI Assistant</p>
            <p>How can I help you?</p>
          </div>
            <button 
              className={styles.closeBubble}
              onClick={() => setHasNewMessage(false)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* AI聊天机器人对话框 */}
      <AIChatBot isOpen={isChatOpen} onClose={handleCloseChat} />
    </>
  );
};

export default AIChatButton;