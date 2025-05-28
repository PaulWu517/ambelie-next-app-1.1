'use client'; // 将 Header 标记为客户端组件

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react'; // 引入 useState 和 useEffect
import { usePathname } from 'next/navigation'; // 引入 usePathname 来获取当前路径

// 注意：Mega Menu 的动态交互 (如鼠标悬停显示、分类切换等) 
// 将需要客户端 JavaScript 逻辑，我们稍后会添加。
// 目前这只是结构和样式的迁移。

export default function Header() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [activePrimaryCategory, setActivePrimaryCategory] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  // 移除 isHeaderHovered 状态，现在使用纯CSS :hover 处理
  // const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const pathname = usePathname(); // 获取当前路径

  // 处理页面滚动事件，用于改变 header 样式
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50); // 当滚动超过50px时，认为已滚动
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mega Menu 的显示/隐藏逻辑
  const handleCollectionsMouseEnter = () => {
    setIsMegaMenuOpen(true);
    // 如果没有激活的分类，默认激活第一个
    if (!activePrimaryCategory) {
      setActivePrimaryCategory('asian-art');
    }
  };

  const handleMegaMenuMouseLeave = () => {
    setIsMegaMenuOpen(false);
    // 延迟重置激活分类，确保关闭动画完成
    setTimeout(() => {
      setActivePrimaryCategory(null);
    }, 300);
  };

  // 处理其他导航项的鼠标悬停，关闭mega menu
  const handleOtherNavMouseEnter = () => {
    if (isMegaMenuOpen) {
      setIsMegaMenuOpen(false);
      setTimeout(() => {
        setActivePrimaryCategory(null);
      }, 300);
    }
  };

  // Header 悬停逻辑
  // 注释掉 Header 悬停事件处理器，现在使用纯CSS的:hover
  // const handleHeaderMouseEnter = () => {
  //   setIsHeaderHovered(true);
  // };

  // const handleHeaderMouseLeave = () => {
  //   setIsHeaderHovered(false);
  // };

  // 点击一级分类，设置当前激活的分类
  const handlePrimaryCategoryClick = (category: string) => {
    if (category !== activePrimaryCategory) {
    setActivePrimaryCategory(category);
    }
  };

  // 构建 header 的 className
  const isHomepage = pathname === '/';
  // Header 激活条件：滚动了，或者MegaMenu打开了（移除了鼠标悬停，因为现在用CSS处理）
  const isHeaderConditionallyActive = isScrolled || isMegaMenuOpen;

  let headerClasses = ['site-header'];
  if (isScrolled) {
    headerClasses.push('scrolled');
  }
  if (isMegaMenuOpen) {
    headerClasses.push('menu-active');
  }
  // 移除 header-is-hovered 类，因为现在用CSS :hover 处理
  // if (isHeaderHovered) {
  //   headerClasses.push('header-is-hovered');
  // }

  const headerClassName = headerClasses.join(' ').trim();


  // 构建 Mega Menu 容器的 className
  const megaMenuContainerClassName = `mega-menu-container ${
    isMegaMenuOpen ? 'active' : ''
  } ${
    activePrimaryCategory ? 'has-active-primary' : ''
  }`.trim();
  
  // 根据header状态决定Logo源或样式
  // 假设 /assets/vi/Ambelie_VI_Logos.png 是深色logo
  // 在首页且header未激活时，应该显示白色logo
  // 其他情况显示深色logo
  const showWhiteLogo = isHomepage && !isHeaderConditionallyActive;
  // CSS会处理logo颜色，这里只准备一个变量给Image的className，以便CSS区分
  const logoImageClassName = showWhiteLogo ? 'logo-white' : 'logo-dark';


  return (
    <>
      <header 
        className={headerClassName}
        // 移除JavaScript悬停事件处理器，现在使用纯CSS :hover
        // onMouseEnter={handleHeaderMouseEnter}
        // onMouseLeave={handleHeaderMouseLeave}
      >
        <nav className="main-navigation left-navigation">
          <ul>
            <li 
              className={`menu-item ${isMegaMenuOpen ? 'active' : ''}`}
              onMouseEnter={handleCollectionsMouseEnter} 
              // onMouseLeave 不直接在这里处理，因为鼠标需要能移动到 mega-menu 上
            >
              <Link href="javascript:void(0)">COLLECTIONS</Link>
            </li>
            <li 
              className={`menu-item ${pathname === '/exhibitions' ? 'active' : ''}`}
              onMouseEnter={handleOtherNavMouseEnter}
            >
              <Link href="/exhibitions">EXHIBITIONS</Link>
            </li>
            <li 
              className={`menu-item ${pathname === '/events' ? 'active' : ''}`}
              onMouseEnter={handleOtherNavMouseEnter}
            >
              <Link href="/events">EVENTS</Link>
            </li>
          </ul>
        </nav>
        
        <div className="logo" onMouseEnter={handleOtherNavMouseEnter}>
          <Link href="/">
            {/* 添加 logoImageClassName 以便CSS可以target */}
            <Image 
              className={logoImageClassName} 
              src="/assets/vi/Ambelie_VI_Logos.png" 
              alt="Ambelie Logo" 
              width={150} 
              height={40} 
              style={{maxHeight: '40px', width: 'auto'}} 
              priority 
            />
          </Link>
        </div>
        
        <nav className="main-navigation right-navigation">
          <ul>
            <li 
              className={`menu-item ${pathname === '/projects' ? 'active' : ''}`}
              onMouseEnter={handleOtherNavMouseEnter}
            >
              <Link href="/projects">PROJECTS</Link>
            </li>
            <li 
              className={`menu-item ${pathname === '/about' ? 'active' : ''}`}
              onMouseEnter={handleOtherNavMouseEnter}
            >
              <Link href="/about">ABOUT</Link>
            </li>
            <li 
              className={`menu-item ${pathname === '/contact' ? 'active' : ''}`}
              onMouseEnter={handleOtherNavMouseEnter}
            >
              <Link href="/contact">CONTACT</Link>
            </li>
          </ul>
        </nav>
      </header>

      <div 
        className={megaMenuContainerClassName}
        onMouseLeave={handleMegaMenuMouseLeave} // 当鼠标离开整个 mega menu 区域时关闭
      >
        <div className="mega-menu" id="collection-menu"> {/* 这个id可能不再直接需要，因为状态由React管理 */} 
          <div className="primary-categories">
            <ul>
              {[ 'asian-art', 'antique', 'designers', 'fashion', 'brands'].map((cat) => (
                <li 
                  key={cat}
                  className={`primary-category ${activePrimaryCategory === cat ? 'active' : ''}`}
                  onClick={() => handlePrimaryCategoryClick(cat)}
                  onMouseEnter={() => setActivePrimaryCategory(cat)} // 鼠标悬停在一级分类上也激活它
                >
                  {/* 将分类名美化显示，例如：asian-art -> Asian Art */}
                  {cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </li>
              ))}
            </ul>
          </div>
          <div className="mega-menu-content">
            {/* 根据 activePrimaryCategory 动态显示对应的 menu-section */} 
            {/* Asian art */}
            <div className={`menu-section ${activePrimaryCategory === 'asian-art' ? 'active' : ''}`} data-section="asian-art">
              <ul className="menu-links">
                <li><Link href="/category/dividers">Dividers</Link></li>
                <li><Link href="/category/chairs">Chairs</Link></li>
                <li><Link href="/category/embroidery">Embroidery</Link></li>
                <li><Link href="/category/coffee-tables">Coffee tables</Link></li>
                <li><Link href="/category/tables">Tables</Link></li>
                <li><Link href="/category/cabinets">Cabinets</Link></li>
                <li><Link href="/category/lighting">Lighting</Link></li>
                <li><Link href="/category/others">Others</Link></li>
              </ul>
            </div>
            {/* Antique */}
            <div className={`menu-section ${activePrimaryCategory === 'antique' ? 'active' : ''}`} data-section="antique">
              <ul className="menu-links">
                <li><Link href="/category/dividers">Dividers</Link></li>
                <li><Link href="/category/chairs">Chairs</Link></li>
                <li><Link href="/category/sofas">Sofas</Link></li>
                <li><Link href="/category/coffee-tables">Coffee tables</Link></li>
                <li><Link href="/category/tables">Tables</Link></li>
                <li><Link href="/category/cabinets">Cabinets</Link></li>
                <li><Link href="/category/lighting">Lighting</Link></li>
                <li><Link href="/category/others">Others</Link></li>
              </ul>
            </div>
            {/* Designers */}
            <div className={`menu-section ${activePrimaryCategory === 'designers' ? 'active' : ''}`} data-section="designers">
              <ul className="menu-links">
                <li><Link href="/category/dividers">Dividers</Link></li>
                <li><Link href="/category/chairs">Chairs</Link></li>
                <li><Link href="/category/sofas">Sofas</Link></li>
                <li><Link href="/category/coffee-tables">Coffee tables</Link></li>
                <li><Link href="/category/tables">Tables</Link></li>
                <li><Link href="/category/cabinets">Cabinets</Link></li>
                <li><Link href="/category/lighting">Lighting</Link></li>
                <li><Link href="/category/others">Others</Link></li>
              </ul>
            </div>
            {/* Fashion */}
            <div className={`menu-section ${activePrimaryCategory === 'fashion' ? 'active' : ''}`} data-section="fashion">
              <ul className="menu-links">
                <li><Link href="/category/rent">Rent</Link></li>
                <li><Link href="/category/bottom">Bottom</Link></li>
                <li><Link href="/category/top">Top</Link></li>
                <li><Link href="/category/coats">Coats</Link></li>
                <li><Link href="/category/shoes">Shoes</Link></li>
                <li><Link href="/category/accessories">Accessories</Link></li>
                <li><Link href="/category/jackets">Jackets</Link></li>
                <li><Link href="/category/dress">Dress</Link></li>
                <li><Link href="/category/lifestyle">Lifestyle</Link></li>
                <li><Link href="/category/suit">Suit</Link></li>
              </ul>
            </div>
            {/* Brands */}
            <div className={`menu-section ${activePrimaryCategory === 'brands' ? 'active' : ''}`} data-section="brands">
              <ul className="menu-links">
                <li><Link href="/category/yamagiwa">Yamagiwa</Link></li>
                <li><Link href="/category/fortuny">Fortuny</Link></li>
                <li><Link href="/category/artempo">Artempo</Link></li>
                <li><Link href="/category/communs">Communs</Link></li>
                <li><Link href="/category/tba">T.ba</Link></li>
                <li><Link href="/category/archivio">ARCHIVIO</Link></li>
                <li><Link href="/category/tbc">TBC</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 