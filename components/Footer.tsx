'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const router = useRouter();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      router.push(`/contact?email=${encodeURIComponent(email.trim())}`);
    }
  };
  return (
    <footer className="site-footer">
      <div className="footer-divider"></div>
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-brand">AMBELIE</div>
          <div className="footer-address">
            <p>Shanghai: No. 21, Kangping Road, Xuhui District</p>
            <p>Hangzhou: No. 1788 Hongning Road, Xiaoshan District</p>
            <p>Email: info@ambelie.com</p>
          </div>
          <div className="footer-copyright">© 2024, AMBELIE. ALL RIGHTS RESERVED</div>
          <div className="footer-terms">
            {/* 假设 terms 和 privacy 页面路径 */}
            <Link href="/terms">TERMS</Link> & <Link href="/privacy">PRIVACY</Link>
          </div>
        </div>
        
        <div className="footer-center">
          <div className="footer-links-group">
            <h3>COLLECTIONS</h3>
            <ul>
              <li><Link href="/oriental-furniture">ORIENTAL FURNITURE</Link></li>
              <li><Link href="/antique-furniture">ANTIQUE FURNITURE</Link></li>
              <li><Link href="/lighting">LIGHTING</Link></li>
              <li><Link href="/art">ART</Link></li>
              <li><Link href="/fashion">FASHION</Link></li>
            </ul>
          </div>
          <div className="footer-links-group">
            <h3>EXPLORE</h3>
            <ul>
              <li><Link href="/exhibitions">EXHIBITIONS</Link></li>
              <li><Link href="/press">PRESS</Link></li>
              <li><Link href="/projects">PROJECTS</Link></li>
            </ul>
          </div>
          <div className="footer-links-group">
            <h3>SERVICES</h3>
            <ul>
              <li><Link href="/about">ABOUT</Link></li>
              <li><Link href="/contact">CONTACT</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-right">
          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <button type="submit">Subscribe</button>
          </form>
          <div className="footer-social">
            <Link href="https://www.instagram.com/ambelie_gallery" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></Link>
            <Link href="https://www.xiaohongshu.com/user/profile/5ac6c62b4eacab09381921ec" target="_blank" rel="noopener noreferrer" aria-label="小红书" title="小红书官方账号">
              <Image src="/assets/vi/小红书-copy.png" alt="小红书" width={18} height={18} className="xiaohongshu-logo" />
            </Link>
            <div 
              className="wechat-container"
              onMouseEnter={() => setShowQRCode(true)}
              onMouseLeave={() => setShowQRCode(false)}
              style={{ position: 'relative', display: 'inline-block' }}
            >
              <Link href="#" aria-label="WeChat" title="请扫描二维码关注我们"><i className="fab fa-weixin"></i></Link>
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
          </div>
        </div>
      </div>
    </footer>
  );
}