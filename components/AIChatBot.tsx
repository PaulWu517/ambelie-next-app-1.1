'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './AIChatBot.module.css';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface AIChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChatBot: React.FC<AIChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I am the AMBELIE AI customer service assistant, and I am happy to serve you. I can help you with product information, purchasing process, delivery services and other questions. How can I help you?',
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 模拟AI回复的知识库
  const getAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // 产品相关问题
    if (message.includes('家具') || message.includes('产品') || message.includes('价格')) {
      return 'AMBELIE提供精选的东方家具、古董家具、灯具和时尚服装。我们的产品都经过精心挑选，具有独特的设计和优质的工艺。您可以浏览我们的产品页面查看详细信息和价格。需要我为您推荐特定类型的产品吗？';
    }
    
    // 购买流程
    if (message.includes('购买') || message.includes('下单') || message.includes('支付')) {
      return '购买流程很简单：1. 浏览并选择您喜欢的产品 2. 点击"加入购物车" 3. 在购物车中确认商品信息 4. 填写收货地址 5. 选择支付方式完成付款。我们支持多种安全的支付方式，包括信用卡、支付宝等。';
    }
    
    // 配送相关
    if (message.includes('配送') || message.includes('物流') || message.includes('快递')) {
      return '我们提供专业的配送服务：\n• 标准配送：3-7个工作日\n• 大件家具：提供专业安装服务\n• 全国范围内配送\n• 部分地区提供当日达服务\n配送费用根据商品重量和配送距离计算，具体费用在结算时显示。';
    }
    
    // 退换货
    if (message.includes('退货') || message.includes('换货') || message.includes('退款')) {
      return '我们提供7天无理由退换货服务：\n• 商品需保持原包装和标签\n• 大件商品需要预约上门取货\n• 退款将在收到商品后3-5个工作日内处理\n• 如有质量问题，我们承担所有费用\n需要申请退换货吗？我可以为您转接人工客服。';
    }
    
    // 展览相关
    if (message.includes('展览') || message.includes('活动') || message.includes('展厅')) {
      return 'AMBELIE在上海和杭州都设有展厅，定期举办精彩的展览活动。您可以：\n• 预约参观我们的实体展厅\n• 了解最新的展览信息\n• 参加产品发布会和文化活动\n• 享受专业的设计咨询服务\n需要我为您提供展厅地址和预约信息吗？';
    }
    
    // 尺寸定制
    if (message.includes('定制') || message.includes('尺寸') || message.includes('个性化')) {
      return '我们提供个性化定制服务：\n• 家具尺寸调整\n• 颜色和材质选择\n• 个性化设计方案\n• 专业设计师一对一服务\n定制服务需要额外的制作时间，通常为2-4周。具体的定制选项和价格，建议您联系我们的设计顾问详细咨询。';
    }
    
    // 会员相关
    if (message.includes('会员') || message.includes('积分') || message.includes('优惠')) {
      return '成为AMBELIE会员享受更多权益：\n• 新会员注册即享9折优惠\n• 购物积分可抵扣现金\n• 会员专享活动和新品预览\n• 生日月特别优惠\n• 免费设计咨询服务\n您可以在网站右上角注册成为会员，或者我可以帮您转接客服协助注册。';
    }
    
    // 联系方式
    if (message.includes('联系') || message.includes('电话') || message.includes('地址')) {
      return '您可以通过以下方式联系我们：\n• 客服热线：400-XXX-XXXX（工作日9:00-18:00）\n• 邮箱：service@ambelie.com\n• 微信客服：AMBELIE官方客服\n• 上海展厅：上海市XXX区XXX路XXX号\n• 杭州展厅：杭州市XXX区XXX路XXX号\n如需紧急帮助，我可以立即为您转接人工客服。';
    }
    
    // 默认回复
    const defaultResponses = [
      '感谢您的咨询！我正在为您查找相关信息，请稍等片刻...',
      '这是一个很好的问题！让我为您详细解答。如果您需要更专业的建议，我可以为您转接人工客服。',
      '我理解您的需求。AMBELIE致力于为每位客户提供最优质的服务和产品。您还有其他问题吗？',
      '非常感谢您选择AMBELIE！如果我的回答没有完全解决您的问题，请告诉我更多详细信息，或者我可以为您转接专业顾问。'
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // 模拟AI思考时间
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(inputText),
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // 1-3秒随机延迟
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    'What are the product prices?',
    'How long does delivery take?',
    'Can I return or exchange items?',
    'Do you have showrooms to visit?'
  ];

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.chatOverlay}>
      <div className={styles.chatContainer}>
        {/* 聊天头部 */}
        <div className={styles.chatHeader}>
          <div className={styles.botInfo}>
            <div className={styles.botDetails}>
              <h3>AMBELIE AI Assistant</h3>
              <span className={styles.onlineStatus}>Online</span>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Close Chat">
            ✕
          </button>
        </div>

        {/* 聊天消息区域 */}
        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${message.isBot ? styles.botMessage : styles.userMessage}`}
            >
              {message.isBot && (
                <div className={styles.messageAvatar}>
                  <img src="/assets/vi/头像.jpg" alt="AI Assistant" />
                </div>
              )}
              <div className={styles.messageContent}>
                <div className={styles.messageText}>
                  {message.text.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* AI正在输入提示 */}
          {isTyping && (
            <div className={`${styles.message} ${styles.botMessage}`}>
              <div className={styles.messageAvatar}>
                <img src="/assets/vi/头像.jpg" alt="AI Assistant" />
              </div>
              <div className={styles.messageContent}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 快捷问题 */}
        {messages.length === 1 && (
          <div className={styles.quickQuestions}>
            <p>Frequently Asked Questions:</p>
            <div className={styles.questionButtons}>
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  className={styles.quickButton}
                  onClick={() => handleQuickQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Please enter your question..."
              className={styles.messageInput}
              rows={1}
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              className={styles.sendButton}
              disabled={!inputText.trim() || isTyping}
              title="Send Message"
            >
              <img src="/assets/vi/发送.png" alt="Send" className={styles.sendIcon} />
            </button>
          </div>
          <div className={styles.inputHint}>
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatBot;