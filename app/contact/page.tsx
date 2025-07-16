import Image from 'next/image';
import Link from 'next/link';
import ContactForm from './ContactForm';

// 元数据定义
export const metadata = {
  title: "Contact Us | Ambelie",
  description: "Get in touch with Ambelie. Find our showroom locations in Shanghai and Hangzhou, or send us a message through our contact form.",
};

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
              <h3>Shanghai Showroom</h3>
              <p className="address">No. 376 Wukang Road, Xuhui District</p>
              <p className="phone">+86 21 6473 7638</p>
              <p className="email">shanghai@ambelie.com</p>
              <p className="hours">Monday - Sunday: 10:00 - 19:00</p>
            </div>
            
            <div className="location-item">
              <h3>Hangzhou Showroom</h3>
              <p className="address">No. 87 Hefang Street, Shangcheng District</p>
              <p className="phone">+86 571 8871 9025</p>
              <p className="email">hangzhou@ambelie.com</p>
              <p className="hours">Tuesday - Sunday: 10:00 - 18:00</p>
            </div>
            
            <div className="social-links">
              <h3>Follow Us</h3>
              <div className="social-icons">
                <a href="#" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer"><i className="fab fa-weixin"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer"><i className="fab fa-weibo"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="小红书" title="小红书官方账号">
                  <Image src="/assets/vi/xiaohongshuicon-01.png" alt="小红书" width={18} height={18} className="xiaohongshu-logo-white" />
                </a>
              </div>
            </div>
          </div>
          
          {/* 右侧：联系表单 */}
          <ContactForm />
        </div>
      </section>
    </main>
  );
} 