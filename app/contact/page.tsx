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
                <a href="#" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer"><i className="fab fa-weixin"></i></a>
                <a href="https://www.xiaohongshu.com/user/profile/5ac6c62b4eacab09381921ec" target="_blank" rel="noopener noreferrer" aria-label="小红书" title="小红书官方账号">
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