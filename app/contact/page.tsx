'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import ContactForm from './ContactForm';

// 注意：由于使用了'use client'，metadata需要在layout.tsx中定义

function WeChatIcon() {
  const [showQRCode, setShowQRCode] = useState(false);

  return (
    <div 
      className="wechat-container"
      onMouseEnter={() => setShowQRCode(true)}
      onMouseLeave={() => setShowQRCode(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <a href="#" aria-label="WeChat" title="Scan to Follow WeChat"><i className="fab fa-weixin"></i></a>
      {showQRCode && (
        <div 
          className="qr-code-popup"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '12px',
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 1000,
            border: '1px solid #e0e0e0',
            minWidth: '200px'
          }}
        >
          <Image 
            src="/assets/images/QR code.jpg" 
            alt="WeChat QR Code" 
            width={160} 
            height={160}
            style={{ display: 'block', margin: '0 auto' }}
          />
          <p style={{ 
            margin: '10px 0 0 0', 
            fontSize: '14px', 
            textAlign: 'center', 
            color: '#666',
            fontWeight: '500'
          }}>Scan to Follow WeChat</p>
        </div>
      )}
    </div>
  );
}

export default function ContactPage() {
  return (
    <main className="contact-page">
      {/* 联系页面内容 */}
      <section className="contact-section">
        <div className="contact-container">
          {/* 左侧：联系信息和地图 */}
          <div className="contact-info" style={{ padding: '25px' }}>
            <h2 className="contact-section-title">Our Locations</h2>
            
            <div className="location-item">
              <h3>Ambelie Shanghai</h3>
              <p className="address">No. 21, Kangping Road, Xuhui District</p>
              <p className="email">Info@ambelie.com</p>
              <p className="hours">Monday - Sunday: 10:00 - 20:00</p>
            </div>
            
            <div className="location-item">
              <h3>Ambelie Hangzhou</h3>
              <p className="address">No. 1788 Hongning Road, Xiaoshan District</p>
              <p className="email">Info@ambelie.com</p>
              <p className="hours">Monday - Sunday: 10:00 - 20:00</p>
            </div>
            
            <div className="social-links">
              <h3>Follow Us</h3>
              <div className="social-icons">
                <a href="https://www.instagram.com/ambelie_gallery" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
                <WeChatIcon />
                <a href="https://www.xiaohongshu.com/user/profile/5ac6c62b4eacab09381921ec" target="_blank" rel="noopener noreferrer" aria-label="小红书" title="小红书官方账号">
                  <Image src="/assets/vi/xiaohongshuicon-01.png" alt="小红书" width={18} height={18} className="xiaohongshu-logo-white" />
                </a>
              </div>
            </div>
          </div>
          
          {/* 右侧：联系表单 */}
          <Suspense fallback={<div>Loading...</div>}>
            <ContactForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}