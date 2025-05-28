import Image from 'next/image';
import Link from 'next/link';

// 元数据定义
export const metadata = {
  title: "Contact Us | Ambelie",
  description: "Get in touch with Ambelie. Find our showroom locations in Shanghai and Hangzhou, or send us a message through our contact form.",
};

export default function ContactPage() {
  return (
    <main>
      {/* 联系页面内容 */}
      <section className="contact-section" style={{ marginTop: '10px' }}>
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
          <div className="contact-form-container" style={{ flex: '0 0 55%' }}>
            <h2 className="contact-form-title">Contact Us</h2>
            <form className="contact-form"> {/* Removed id="contactForm" for now */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="enquiryType">Enquiry type<span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select id="enquiryType" name="enquiryType" required>
                      <option value="">Please select</option>
                      <option value="general">General Inquiry</option>
                      <option value="products">Product Information</option>
                      <option value="custom">Custom Orders</option>
                      <option value="collaboration">Business Collaboration</option>
                      <option value="press">Press & Media</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email address<span className="required">*</span></label>
                  <input type="email" id="email" name="email" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Name<span className="required">*</span></label>
                  <input type="text" id="name" name="name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="country">Country/Location<span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select id="country" name="country" required>
                      <option value="">Please select</option>
                      <option value="china">China</option>
                      <option value="japan">Japan</option>
                      <option value="korea">South Korea</option>
                      <option value="singapore">Singapore</option>
                      <option value="usa">United States</option>
                      <option value="uk">United Kingdom</option>
                      <option value="france">France</option>
                      <option value="italy">Italy</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group full-width">
                <label htmlFor="message">Message<span className="required">*</span></label>
                <textarea id="message" name="message" rows={6} required></textarea>
              </div>
              <div className="form-group full-width">
                <label htmlFor="hearAboutUs">How did you hear about us?</label>
                <div className="select-wrapper">
                  <select id="hearAboutUs" name="hearAboutUs">
                    <option value="">Please select</option>
                    <option value="search">Search Engine</option>
                    <option value="social">Social Media</option>
                    <option value="friend">Friend or Colleague</option>
                    <option value="magazine">Magazine or Publication</option>
                    <option value="event">Exhibition or Event</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <p className="form-note">* Required field</p>
              <div className="privacy-policy">
                <p>By submitting this form you are confirming you are happy for us to pass on your details, where necessary, to Partners/Agents of Porta Romana for the strict purpose of allowing us to complete your request. We will never pass your details on to any third parties for marketing or any other purpose.</p>
                <p>All details provided by you are in accordance with our <Link href="/privacy-policy">Privacy Policy</Link></p> {/* Changed to Link */}
                <div className="checkbox-wrapper">
                  <input type="checkbox" id="agree" name="agree" required />
                  <label htmlFor="agree">I Agree</label>
                </div>
              </div>
              <button type="submit" className="submit-button">SEND</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
} 