import Link from 'next/link';
import Image from 'next/image'; // 如果页脚中有图片，则需要

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-divider"></div>
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-brand">AMBELIE</div>
          <div className="footer-address">
            <p>Shanghai: No. 376 Wukang Road, Xuhui District</p>
            <p>Hangzhou: No. 87 Hefang Street, Shangcheng District</p>
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
            <h3>EXPLORE</h3>
            <ul>
              {/* 假设的页面路径 */}
              <li><Link href="/category/all">COLLECTIONS</Link></li> 
              <li><Link href="/exhibitions">EXHIBITIONS</Link></li>
              <li><Link href="/events">EVENTS</Link></li>
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
          {/* Newsletter 表单的提交逻辑需要后续处理 */}
          <form className="newsletter-form">
            <input type="email" placeholder="Email address" required />
            <button type="submit">Subscribe</button>
          </form>
          <div className="footer-social">
            <Link href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></Link>
            <Link href="#" aria-label="小红书" title="小红书官方账号">
              {/* 确保图片路径正确，并且图片在 public/assets/vi/ 目录下 */}
              <Image src="/assets/vi/小红书-copy.png" alt="小红书" width={18} height={18} className="xiaohongshu-logo" />
            </Link>
            <Link href="#" aria-label="WeChat" title="请扫描二维码关注我们"><i className="fab fa-weixin"></i></Link>
            <Link href="#" aria-label="Weibo"><i className="fab fa-weibo"></i></Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 