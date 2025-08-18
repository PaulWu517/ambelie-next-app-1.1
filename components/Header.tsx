'use client'; // 将 Header 标记为客户端组件

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation'; // 引入 usePathname 和 useRouter
import { Search, User, ShoppingCart, LogOut, FileText, Menu, X } from 'lucide-react'; // Import icons
import { useAuth } from '@/lib/hooks/useAuth';
import { useCartStore } from '@/lib/stores/cartStore';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import styles from './Header.module.css'; // 导入模块化 CSS
import UserMenu from './UserMenu';
// import { useAuthStore } from '../lib/stores/authStore'; // 临时注释，避免模块错误

// 注意：Mega Menu 的动态交互 (如鼠标悬停显示、分类切换等) 
// 将需要客户端 JavaScript 逻辑，我们稍后会添加。
// 目前这只是结构和样式的迁移。

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isHomepage = pathname === '/';
  
  // 用户认证状态
  const { user, isLoggedIn, isLoading: authLoading, logout } = useAuth();
  
  // 调试：监听认证状态变化
  useEffect(() => {
    console.log('🏠 Header: Auth state changed:', {
      user: user ? { email: user.email, name: user.name } : null,
      isLoggedIn,
      authLoading
    });
  }, [user, isLoggedIn, authLoading]);
  const { getItemCount } = useCartStore();
  const { getItemCount: getInquiryItemCount } = useInquiryStore();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 移动端侧边栏子菜单展开状态
  const [mobileMenuExpanded, setMobileMenuExpanded] = useState<{[key: string]: boolean}>({});
  
  // 更新状态变量名称以反映新的分类结构
  const [isOrientalFurnitureDropdownOpen, setIsOrientalFurnitureDropdownOpen] = useState(false);
  const [isAntiqueFurnitureDropdownOpen, setIsAntiqueFurnitureDropdownOpen] = useState(false);
  const [isLightingDropdownOpen, setIsLightingDropdownOpen] = useState(false);
  const [isArtDropdownOpen, setIsArtDropdownOpen] = useState(false);
  const [isFashionDropdownOpen, setIsFashionDropdownOpen] = useState(false);
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  
  // 简单链接的悬停状态
  const [isExhibitionHovered, setIsExhibitionHovered] = useState(false);
  const [isProjectHovered, setIsProjectHovered] = useState(false);
  const [isPressHovered, setIsPressHovered] = useState(false);
  
  // 更新动画状态
  const [runOrientalFurnitureAnimation, setRunOrientalFurnitureAnimation] = useState(false);
  const [runAntiqueFurnitureAnimation, setRunAntiqueFurnitureAnimation] = useState(false);
  const [runLightingAnimation, setRunLightingAnimation] = useState(false);
  const [runArtAnimation, setRunArtAnimation] = useState(false);
  const [runFashionAnimation, setRunFashionAnimation] = useState(false);
  const [runAboutAnimation, setRunAboutAnimation] = useState(false);
  
  // 更新timeout引用
  const orientalFurnitureDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const antiqueFurnitureDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lightingDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const artDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fashionDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aboutDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSignOut = async () => {
    try {
      await logout();
      // 刷新页面以确保状态完全重置
      window.location.reload();
    } catch (error) {
      console.error('注销失败:', error);
    }
  };

  // 移动端菜单切换
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    // 关闭侧边栏时重置所有子菜单展开状态
    setMobileMenuExpanded({});
  };

  // 切换移动端子菜单展开状态
  const toggleMobileSubmenu = (menuKey: string) => {
    setMobileMenuExpanded(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // 添加缺少的处理函数
  const handlePressEnter = () => {
    setIsOrientalFurnitureDropdownOpen(false);
    setIsAntiqueFurnitureDropdownOpen(false);
    setIsLightingDropdownOpen(false);
    setIsArtDropdownOpen(false);
    setIsFashionDropdownOpen(false);
    setIsAboutDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(true);
  };

  const handleSimpleLinkMouseLeave = () => {
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
  };

  // 处理页面滚动事件，用于改变 header 样式
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Clear timeouts on component unmount
  useEffect(() => {
    return () => {
      if (orientalFurnitureDropdownTimeoutRef.current) {
        clearTimeout(orientalFurnitureDropdownTimeoutRef.current);
      }
      if (antiqueFurnitureDropdownTimeoutRef.current) {
        clearTimeout(antiqueFurnitureDropdownTimeoutRef.current);
      }
      if (lightingDropdownTimeoutRef.current) {
        clearTimeout(lightingDropdownTimeoutRef.current);
      }
      if (artDropdownTimeoutRef.current) {
        clearTimeout(artDropdownTimeoutRef.current);
      }
      if (fashionDropdownTimeoutRef.current) {
        clearTimeout(fashionDropdownTimeoutRef.current);
      }
      if (aboutDropdownTimeoutRef.current) {
        clearTimeout(aboutDropdownTimeoutRef.current);
      }
    };
  }, []);

  // Effect to trigger animations for Oriental Furniture dropdown
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isOrientalFurnitureDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunOrientalFurnitureAnimation(true);
      }, 20);
    } else {
      setRunOrientalFurnitureAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isOrientalFurnitureDropdownOpen]);

  // Effect to trigger animations for Antique Furniture dropdown
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isAntiqueFurnitureDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunAntiqueFurnitureAnimation(true);
      }, 20);
    } else {
      setRunAntiqueFurnitureAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isAntiqueFurnitureDropdownOpen]);

  // Effect to trigger animations for Lighting dropdown
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isLightingDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunLightingAnimation(true);
      }, 20);
    } else {
      setRunLightingAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isLightingDropdownOpen]);

  // Effect to trigger animations for Art dropdown
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isArtDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunArtAnimation(true);
      }, 20);
    } else {
      setRunArtAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isArtDropdownOpen]);

  // Effect to trigger animations for Fashion dropdown
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isFashionDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunFashionAnimation(true);
      }, 20);
    } else {
      setRunFashionAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isFashionDropdownOpen]);

  // Effect to trigger animations for About dropdown
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isAboutDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunAboutAnimation(true);
      }, 20);
    } else {
      setRunAboutAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isAboutDropdownOpen]);

  // Oriental Furniture Event Handlers
  const handleOrientalFurnitureNavMouseEnter = () => {
    if (orientalFurnitureDropdownTimeoutRef.current) clearTimeout(orientalFurnitureDropdownTimeoutRef.current);
    if (isAntiqueFurnitureDropdownOpen) setIsAntiqueFurnitureDropdownOpen(false);
    if (isLightingDropdownOpen) setIsLightingDropdownOpen(false);
    if (isArtDropdownOpen) setIsArtDropdownOpen(false);
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false);
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
    setIsOrientalFurnitureDropdownOpen(true);
  };
  const handleOrientalFurnitureNavMouseLeave = () => {
    orientalFurnitureDropdownTimeoutRef.current = setTimeout(() => setIsOrientalFurnitureDropdownOpen(false), 200);
  };
  const handleOrientalFurnitureDropdownMouseEnter = () => {
    if (orientalFurnitureDropdownTimeoutRef.current) clearTimeout(orientalFurnitureDropdownTimeoutRef.current);
    // 确保当鼠标在下拉菜单内时，对应的一级标题保持激活状态
    setIsOrientalFurnitureDropdownOpen(true);
  };
  const handleOrientalFurnitureDropdownMouseLeave = () => setIsOrientalFurnitureDropdownOpen(false);

  // Antique Furniture Event Handlers
  const handleAntiqueFurnitureNavMouseEnter = () => {
    if (antiqueFurnitureDropdownTimeoutRef.current) clearTimeout(antiqueFurnitureDropdownTimeoutRef.current);
    if (isOrientalFurnitureDropdownOpen) setIsOrientalFurnitureDropdownOpen(false);
    if (isLightingDropdownOpen) setIsLightingDropdownOpen(false);
    if (isArtDropdownOpen) setIsArtDropdownOpen(false);
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false);
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
    setIsAntiqueFurnitureDropdownOpen(true);
  };
  const handleAntiqueFurnitureNavMouseLeave = () => {
    antiqueFurnitureDropdownTimeoutRef.current = setTimeout(() => setIsAntiqueFurnitureDropdownOpen(false), 200);
  };
  const handleAntiqueFurnitureDropdownMouseEnter = () => {
    if (antiqueFurnitureDropdownTimeoutRef.current) clearTimeout(antiqueFurnitureDropdownTimeoutRef.current);
    // 确保当鼠标在下拉菜单内时，对应的一级标题保持激活状态
    setIsAntiqueFurnitureDropdownOpen(true);
  };
  const handleAntiqueFurnitureDropdownMouseLeave = () => setIsAntiqueFurnitureDropdownOpen(false);

  // Lighting Event Handlers
  const handleLightingNavMouseEnter = () => {
    if (lightingDropdownTimeoutRef.current) clearTimeout(lightingDropdownTimeoutRef.current);
    if (isOrientalFurnitureDropdownOpen) setIsOrientalFurnitureDropdownOpen(false);
    if (isAntiqueFurnitureDropdownOpen) setIsAntiqueFurnitureDropdownOpen(false);
    if (isArtDropdownOpen) setIsArtDropdownOpen(false);
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false);
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
    setIsLightingDropdownOpen(true);
  };
  const handleLightingNavMouseLeave = () => {
    lightingDropdownTimeoutRef.current = setTimeout(() => setIsLightingDropdownOpen(false), 200);
  };
  const handleLightingDropdownMouseEnter = () => {
    if (lightingDropdownTimeoutRef.current) clearTimeout(lightingDropdownTimeoutRef.current);
    // 确保当鼠标在下拉菜单内时，对应的一级标题保持激活状态
    setIsLightingDropdownOpen(true);
  };
  const handleLightingDropdownMouseLeave = () => setIsLightingDropdownOpen(false);

  // Art Event Handlers
  const handleArtNavMouseEnter = () => {
    if (artDropdownTimeoutRef.current) clearTimeout(artDropdownTimeoutRef.current);
    if (isOrientalFurnitureDropdownOpen) setIsOrientalFurnitureDropdownOpen(false);
    if (isAntiqueFurnitureDropdownOpen) setIsAntiqueFurnitureDropdownOpen(false);
    if (isLightingDropdownOpen) setIsLightingDropdownOpen(false);
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false);
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
    setIsArtDropdownOpen(true);
  };
  const handleArtNavMouseLeave = () => {
    artDropdownTimeoutRef.current = setTimeout(() => setIsArtDropdownOpen(false), 200);
  };
  const handleArtDropdownMouseEnter = () => {
    if (artDropdownTimeoutRef.current) clearTimeout(artDropdownTimeoutRef.current);
    // 确保当鼠标在下拉菜单内时，对应的一级标题保持激活状态
    setIsArtDropdownOpen(true);
  };
  const handleArtDropdownMouseLeave = () => setIsArtDropdownOpen(false);

  // Fashion Event Handlers
  const handleFashionNavMouseEnter = () => {
    if (fashionDropdownTimeoutRef.current) clearTimeout(fashionDropdownTimeoutRef.current);
    if (isOrientalFurnitureDropdownOpen) setIsOrientalFurnitureDropdownOpen(false);
    if (isAntiqueFurnitureDropdownOpen) setIsAntiqueFurnitureDropdownOpen(false);
    if (isLightingDropdownOpen) setIsLightingDropdownOpen(false);
    if (isArtDropdownOpen) setIsArtDropdownOpen(false);
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
    setIsFashionDropdownOpen(true);
  };
  const handleFashionNavMouseLeave = () => {
    fashionDropdownTimeoutRef.current = setTimeout(() => setIsFashionDropdownOpen(false), 200);
  };
  const handleFashionDropdownMouseEnter = () => {
    if (fashionDropdownTimeoutRef.current) clearTimeout(fashionDropdownTimeoutRef.current);
    // 确保当鼠标在下拉菜单内时，对应的一级标题保持激活状态
    setIsFashionDropdownOpen(true);
  };
  const handleFashionDropdownMouseLeave = () => setIsFashionDropdownOpen(false);

  // About Event Handlers
  const handleAboutNavMouseEnter = () => {
    if (aboutDropdownTimeoutRef.current) clearTimeout(aboutDropdownTimeoutRef.current);
    if (isOrientalFurnitureDropdownOpen) setIsOrientalFurnitureDropdownOpen(false);
    if (isAntiqueFurnitureDropdownOpen) setIsAntiqueFurnitureDropdownOpen(false);
    if (isLightingDropdownOpen) setIsLightingDropdownOpen(false);
    if (isArtDropdownOpen) setIsArtDropdownOpen(false);
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
    setIsAboutDropdownOpen(true);
  };
  const handleAboutNavMouseLeave = () => {
    aboutDropdownTimeoutRef.current = setTimeout(() => setIsAboutDropdownOpen(false), 200);
  };
  const handleAboutDropdownMouseEnter = () => {
    if (aboutDropdownTimeoutRef.current) clearTimeout(aboutDropdownTimeoutRef.current);
    // 确保当鼠标在下拉菜单内时，对应的一级标题保持激活状态
    setIsAboutDropdownOpen(true);
  };
  const handleAboutDropdownMouseLeave = () => setIsAboutDropdownOpen(false);

  // Handlers for simple menu items
  const handleExhibitionsEnter = () => {
    setIsOrientalFurnitureDropdownOpen(false);
    setIsAntiqueFurnitureDropdownOpen(false);
    setIsLightingDropdownOpen(false);
    setIsArtDropdownOpen(false);
    setIsFashionDropdownOpen(false);
    setIsAboutDropdownOpen(false);
    setIsProjectHovered(false);
    setIsPressHovered(false);
    setIsExhibitionHovered(true);
  };

  const handleProjectsEnter = () => {
    setIsOrientalFurnitureDropdownOpen(false);
    setIsAntiqueFurnitureDropdownOpen(false);
    setIsLightingDropdownOpen(false);
    setIsArtDropdownOpen(false);
    setIsFashionDropdownOpen(false);
    setIsAboutDropdownOpen(false);
    setIsExhibitionHovered(false);
    setIsPressHovered(false);
    setIsProjectHovered(true);
  };

  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  let headerClasses = [styles.siteHeader];

  // 非首页时，直接显示白色背景状态
  if (!isHomepage) {
    headerClasses.push(styles.scrolled);
  }
  
  // 首页滚动时，显示白色背景状态
  if (isHomepage && isScrolled) {
    headerClasses.push(styles.scrolled);
  }

  // 下拉菜单打开或导航项悬停时，显示白色背景
  if (isOrientalFurnitureDropdownOpen || isAntiqueFurnitureDropdownOpen || isLightingDropdownOpen || isArtDropdownOpen || isFashionDropdownOpen || isAboutDropdownOpen || isExhibitionHovered || isProjectHovered || isPressHovered) {
    if (!headerClasses.includes(styles.menuActive)) {
        headerClasses.push(styles.menuActive);
    }
  }

  // 首页特殊悬停效果
  if (isHomepage && !isScrolled && isHeaderHovered && !isOrientalFurnitureDropdownOpen && !isAntiqueFurnitureDropdownOpen && !isLightingDropdownOpen && !isArtDropdownOpen && !isFashionDropdownOpen && !isAboutDropdownOpen && !isExhibitionHovered && !isProjectHovered && !isPressHovered) {
    headerClasses.push(styles.menuActive);
  }

  const headerClassName = headerClasses.join(' ');

  // 计算当前header是否处于激活状态（滚动、悬停、下拉菜单打开等）
  const headerIsActive = (isScrolled || isHeaderHovered || isOrientalFurnitureDropdownOpen || isAntiqueFurnitureDropdownOpen || isLightingDropdownOpen || isArtDropdownOpen || isFashionDropdownOpen || isAboutDropdownOpen || isExhibitionHovered || isProjectHovered || isPressHovered);

  // 计算logo类名
  const logoImageClassName = `logo-${isHomepage && !headerIsActive ? 'white' : 'dark'}`;

  // 计算颜色
  const searchIconColor = (isHomepage && !headerIsActive) ? 'white' : 'black';
  const userIconColor = (isHomepage && !headerIsActive) ? 'white' : 'black';
  
  // 计算文字颜色（用于Sign In文字）
  const textColor = (isHomepage && !headerIsActive) ? 'white' : 'black';

  // 更新导航链接结构
  const orientalFurnitureLinks = [
      { name: 'SCREENS', href: '/oriental-furniture?category=screens' },
    { name: 'CHAIRS', href: '/oriental-furniture?category=chairs' },
    { name: 'TABLES', href: '/oriental-furniture?category=tables' },
      { name: 'CABINETS & CUPBOARDS', href: '/oriental-furniture?category=cabinets-and-cupboards' },
      { name: 'RUGS', href: '/oriental-furniture?category=rugs' },
    { name: 'OTHERS', href: '/oriental-furniture?category=others' },
  ];

  const antiqueFurnitureLinks = {
      seating: [
      { name: 'CHAIRS', href: '/antique-furniture?category=seating&subcategory=antique-chairs' },
        { name: 'ARMCHAIRS', href: '/antique-furniture?category=seating&subcategory=armchairs' },
        { name: 'SOFA', href: '/antique-furniture?category=seating&subcategory=sofa' },
      ],
      storage: [
        { name: 'CABINETS', href: '/antique-furniture?category=storage&subcategory=cabinets' },
        { name: 'DRAWERS', href: '/antique-furniture?category=storage&subcategory=drawers' },
        { name: 'NIGHT STANDS', href: '/antique-furniture?category=storage&subcategory=night-stands' },
      ],
      tables: [
        { name: 'DINING TABLES', href: '/antique-furniture?category=tables&subcategory=dining-tables' },
        { name: 'COFFEE TABLES', href: '/antique-furniture?category=tables&subcategory=coffee-tables' },
        { name: 'SIDE TABLES', href: '/antique-furniture?category=tables&subcategory=side-tables' },
      ],
      others: [
      { name: 'DESIGNER COLLECTIONS', href: '/antique-furniture?category=others&subcategory=designer-collections' },
      ],
  };

  const lightingLinks = {
      regular: [
        { name: 'WALL LIGHTS', href: '/lighting?category=category&subcategory=wall-lights' },
        { name: 'TABLE LAMPS', href: '/lighting?category=category&subcategory=table-lamps' },
        { name: 'FLOOR LAMPS', href: '/lighting?category=category&subcategory=floor-lamps' },
        { name: 'PENDANT', href: '/lighting?category=category&subcategory=pendant' },
      ],
      fortuny: [
        { name: 'SILK LAMPS', href: '/lighting?category=fortuny-collection&subcategory=silk-lamps' },
        { name: 'GLASS LAMPS', href: '/lighting?category=fortuny-collection&subcategory=glass-lamps' },
      ],
      yamagiwa: [
      { name: 'FRANK LLOYD WRIGHT COLLECTION', href: '/lighting?category=yamagiwa-collection&subcategory=frank-lloyd-wright-collection' },
      { name: 'JACOBSSON COLLECTION', href: '/lighting?category=yamagiwa-collection&subcategory=jacobsson-collection' },
      ],
  };

  const artLinks = {
      regular: [
        { name: 'SCULPTURE', href: '/art?category=category&subcategory=sculpture' },
        { name: 'PAINTINGS', href: '/art?category=category&subcategory=paintings' },
        { name: 'DRAWINGS & WATERCOLOR', href: '/art?category=category&subcategory=drawings-watercolor' }, 
      ],
    oriental: [
        { name: 'CALLIGRAPHY', href: '/art?category=oriental-art&subcategory=calligraphy' },
        { name: 'EMBROIDERY', href: '/art?category=oriental-art&subcategory=embroidery' },
      ],
  };

  const fashionLinks = {
    shopByCategory: [
      { name: 'TOPS', href: '/fashion?category=category&subcategory=tops' },
      { name: 'JACKETS', href: '/fashion?category=category&subcategory=jackets' },
      { name: 'DRESSES', href: '/fashion?category=category&subcategory=dresses' },
    ],
    runwayArchive: [
      { name: 'TOPS', href: '/fashion?category=runway-archive&subcategory=runway-tops' },
      { name: 'JACKETS', href: '/fashion?category=runway-archive&subcategory=runway-jackets' },
      { name: 'DRESSES', href: '/fashion?category=runway-archive&subcategory=runway-dresses' },
    ],
    curatedCollection: [
      { name: 'TOPS', href: '/fashion?category=curated-collection&subcategory=curated-tops' },
      { name: 'JACKETS', href: '/fashion?category=curated-collection&subcategory=curated-jackets' },
      { name: 'DRESSES', href: '/fashion?category=curated-collection&subcategory=curated-dresses' },
    ],
    brandPartners: [
      { name: 'FORTUNY', href: '/fashion?category=brand-partners&subcategory=fortuny' },
      { name: 'T.BA', href: '/fashion?category=brand-partners&subcategory=t-ba' },
      { name: 'DANIEL HANSON', href: '/fashion?category=brand-partners&subcategory=daniel-hanson' },
      { name: 'ARCHIVIO J.M.RIBOT', href: '/fashion?category=brand-partners&subcategory=archivio-jm-ribot' },
    ],
  };

  const aboutLinks = [
    { name: 'OUR STORY', href: '/about' },
    { name: 'CONTACT', href: '/contact' },
    { name: 'AMBELIE SHANGHAI', href: '/about/shanghai' },
    { name: 'AMBELIE HANGZHOU', href: '/about/hangzhou' },
  ];

  return (
    <>
      <header 
        className={headerClassName}
        onMouseEnter={() => {
          // 只在首页且未滚动时启用悬停效果
          if (isHomepage && !isScrolled) {
            setIsHeaderHovered(true);
          }
        }}
        onMouseLeave={() => {
          // 只在首页且未滚动时启用悬停效果
          if (isHomepage && !isScrolled) {
            setIsHeaderHovered(false);
          }
        }}
      >
        {/* 第一行：Logo - 移动端汉堡菜单 + 用户图标 */}
        <div className={styles.topRow}>
          {/* 最左侧：桌面端搜索按钮 + 移动端汉堡菜单按钮 */}
          <div className={styles.topRowLeft}>
            {/* 桌面端搜索按钮 */}
            <div 
              className={styles.headerSearchIcon}
              onMouseEnter={() => setIsSearchHovered(true)}
              onMouseLeave={() => setIsSearchHovered(false)}
              onClick={() => router.push('/search')}
              style={{ cursor: 'pointer' }}
            >
              <Search size={20} className={styles.searchIcon} style={{ color: searchIconColor }} />
              {isSearchHovered && <span className="search-text" style={{ color: searchIconColor }}>SEARCH</span>}
            </div>
            
            {/* 移动端汉堡菜单按钮 */}
            <button 
              className={styles.mobileMenuButton}
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <Menu size={24} style={{ color: userIconColor }} />
            </button>
          </div>
          
          {/* 中间：Logo */}
          <div className={styles.logo}>
          <Link href="/">
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
        
          {/* 最右侧：用户图标 */}
          <div className={styles.topRowRight}>
            <div className={styles.userMenuContainer}>
              <UserMenu 
                user={user} 
                onSignOut={handleSignOut}
                iconColor={userIconColor}
                textColor={textColor}
              />
            </div>
          </div>
        </div>

        {/* 第二行：所有导航项目 */}
        <div className={styles.bottomRow}>
          <nav className={styles.mainNavigation}>
          <ul>
            <li 
                className={`${styles.menuItem} ${pathname === '/oriental-furniture' || pathname.startsWith('/oriental-furniture/') ? styles.active : ''} ${isOrientalFurnitureDropdownOpen ? styles.dropdownActive : ''}`}
                onMouseEnter={handleOrientalFurnitureNavMouseEnter}
                onMouseLeave={handleOrientalFurnitureNavMouseLeave}
              >
                <Link href="/oriental-furniture">ORIENTAL FURNITURE</Link>
              </li>
              <li
                className={`${styles.menuItem} ${pathname === '/antique-furniture' || pathname.startsWith('/antique-furniture/') ? styles.active : ''} ${isAntiqueFurnitureDropdownOpen ? styles.dropdownActive : ''}`}
                onMouseEnter={handleAntiqueFurnitureNavMouseEnter}
                onMouseLeave={handleAntiqueFurnitureNavMouseLeave}
              >
                <Link href="/antique-furniture">ANTIQUE FURNITURE</Link>
              </li>
              <li
                className={`${styles.menuItem} ${pathname === '/lighting' || pathname.startsWith('/lighting/') ? styles.active : ''} ${isLightingDropdownOpen ? styles.dropdownActive : ''}`}
                onMouseEnter={handleLightingNavMouseEnter}
                onMouseLeave={handleLightingNavMouseLeave}
              >
                <Link href="/lighting">LIGHTING</Link>
              </li>
              <li
                className={`${styles.menuItem} ${pathname === '/art' || pathname.startsWith('/art/') ? styles.active : ''} ${isArtDropdownOpen ? styles.dropdownActive : ''}`}
                onMouseEnter={handleArtNavMouseEnter}
                onMouseLeave={handleArtNavMouseLeave}
              >
                <Link href="/art">ART</Link>
              </li>
              <li
                className={`${styles.menuItem} ${pathname === '/fashion' || pathname.startsWith('/fashion/') ? styles.active : ''} ${isFashionDropdownOpen ? styles.dropdownActive : ''}`}
                onMouseEnter={handleFashionNavMouseEnter}
                onMouseLeave={handleFashionNavMouseLeave}
              >
                <Link href="/fashion">FASHION</Link>
              </li>
              <li 
                className={`${styles.menuItem} ${pathname === '/exhibitions' || pathname.startsWith('/exhibitions/') ? styles.active : ''} ${isExhibitionHovered ? styles.dropdownActive : ''}`}
              onMouseEnter={handleExhibitionsEnter}
              onMouseLeave={handleSimpleLinkMouseLeave}
            >
                <Link href="/exhibitions">EXHIBITION</Link>
            </li>
            <li 
                className={`${styles.menuItem} ${pathname === '/projects' || pathname.startsWith('/projects/') ? styles.active : ''} ${isProjectHovered ? styles.dropdownActive : ''}`}
              onMouseEnter={handleProjectsEnter}
              onMouseLeave={handleSimpleLinkMouseLeave}
            >
                <Link href="/projects">PROJECT</Link>
              </li>
              <li 
                className={`${styles.menuItem} ${pathname === '/press' || pathname.startsWith('/press/') ? styles.active : ''} ${isPressHovered ? styles.dropdownActive : ''}`}
                onMouseEnter={handlePressEnter}
                onMouseLeave={handleSimpleLinkMouseLeave}
              >
                <Link href="/press">PRESS</Link>
            </li>
            <li 
                className={`${styles.menuItem} ${pathname === '/about' || pathname.startsWith('/about/') ? styles.active : ''} ${isAboutDropdownOpen ? styles.dropdownActive : ''}`}
              onMouseEnter={handleAboutNavMouseEnter}
              onMouseLeave={handleAboutNavMouseLeave}
            >
              <a href="#" onClick={(e) => e.preventDefault()}>ABOUT</a>
            </li>
          </ul>
        </nav>
        </div>
      </header>

      {/* Oriental Furniture Dropdown Menu */}
      {isOrientalFurnitureDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isOrientalFurnitureDropdownOpen ? 'active' : ''}`}
          onMouseEnter={handleOrientalFurnitureDropdownMouseEnter}
          onMouseLeave={handleOrientalFurnitureDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content">
            <div className={`furniture-column oriental-group animate-item ${runOrientalFurnitureAnimation ? 'animated delay-50' : ''}`}>
              <div className={`furniture-sub-column animate-item ${runOrientalFurnitureAnimation ? 'animated delay-100' : ''}`}>
                <h3><Link href="/oriental-furniture">SHOP BY CATEGORY</Link></h3>
                <div className="oriental-single-row-container">
                  <Link href="/oriental-furniture?category=screens" className="oriental-category-link">SCREENS</Link>
                  <Link href="/oriental-furniture?category=chairs" className="oriental-category-link">CHAIRS</Link>
                  <Link href="/oriental-furniture?category=tables" className="oriental-category-link">TABLES</Link>
                  <Link href="/oriental-furniture?category=cabinets-and-cupboards" className="oriental-category-link">CABINETS & CUPBOARDS</Link>
                  <Link href="/oriental-furniture?category=rugs" className="oriental-category-link">RUGS</Link>
                  <Link href="/oriental-furniture?category=others" className="oriental-category-link">OTHERS</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Antique Furniture Dropdown Menu */}
      {isAntiqueFurnitureDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isAntiqueFurnitureDropdownOpen ? 'active' : ''}`} 
          onMouseEnter={handleAntiqueFurnitureDropdownMouseEnter}
          onMouseLeave={handleAntiqueFurnitureDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content">
            <div className={`furniture-column antique-group animate-item ${runAntiqueFurnitureAnimation ? 'animated delay-50' : ''}`}>
              <div className="antique-sub-columns-container">
                <div className={`furniture-sub-column animate-item ${runAntiqueFurnitureAnimation ? 'animated delay-100' : ''}`}>
                  <h3><Link href="/antique-furniture?category=seating">SEATING</Link></h3>
                  <ul>
                    {antiqueFurnitureLinks.seating.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runAntiqueFurnitureAnimation ? 'animated delay-150' : ''}`}>
                  <h3><Link href="/antique-furniture?category=storage">STORAGE</Link></h3>
                  <ul>
                    {antiqueFurnitureLinks.storage.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runAntiqueFurnitureAnimation ? 'animated delay-200' : ''}`}>
                  <h3><Link href="/antique-furniture?category=tables">TABLES</Link></h3>
                  <ul>
                    {antiqueFurnitureLinks.tables.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runAntiqueFurnitureAnimation ? 'animated delay-250' : ''}`}>
                  <h3><Link href="/antique-furniture?category=others">OTHERS</Link></h3>
                  <ul>
                    {antiqueFurnitureLinks.others.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lighting Dropdown Menu */}
      {isLightingDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isLightingDropdownOpen ? 'active' : ''}`}
          onMouseEnter={handleLightingDropdownMouseEnter}
          onMouseLeave={handleLightingDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content">
            <div className={`furniture-column lighting-group animate-item ${runLightingAnimation ? 'animated delay-50' : ''}`}>
              <div className="decor-sub-columns-container"> 
                <div className={`furniture-sub-column animate-item ${runLightingAnimation ? 'animated delay-100' : ''}`}>
                  <h3><Link href="/lighting?category=category">SHOP BY CATEGORY</Link></h3>
                  <ul>
                    {lightingLinks.regular.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runLightingAnimation ? 'animated delay-150' : ''}`}>
                  <h3><Link href="/lighting?category=fortuny-collection">FORTUNY COLLECTION</Link></h3>
                  <ul>
                    {lightingLinks.fortuny.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runLightingAnimation ? 'animated delay-200' : ''}`}>
                  <h3><Link href="/lighting?category=yamagiwa-collection">YAMAGIWA COLLECTION</Link></h3>
                  <ul>
                    {lightingLinks.yamagiwa.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Art Dropdown Menu */}
      {isArtDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isArtDropdownOpen ? 'active' : ''}`}
          onMouseEnter={handleArtDropdownMouseEnter}
          onMouseLeave={handleArtDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content">
            <div className={`furniture-column art-group animate-item ${runArtAnimation ? 'animated delay-50' : ''}`}>
              <div className="decor-sub-columns-container"> 
                <div className={`furniture-sub-column animate-item ${runArtAnimation ? 'animated delay-100' : ''}`}>
                  <h3><Link href="/art?category=category">CATEGORY</Link></h3>
                  <ul>
                    {artLinks.regular.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runArtAnimation ? 'animated delay-150' : ''}`}>
                  <h3><Link href="/art?category=oriental-art">ORIENTAL ART</Link></h3>
                  <ul>
                    {artLinks.oriental.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fashion Dropdown Menu */}
      {isFashionDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isFashionDropdownOpen ? 'active' : ''}`}
          onMouseEnter={handleFashionDropdownMouseEnter}
          onMouseLeave={handleFashionDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content">
            <div className={`furniture-column fashion-main-group animate-item ${runFashionAnimation ? 'animated delay-50' : ''}`}>
              <div className="fashion-columns-container"> 
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-100' : ''}`}>
                  <h3><Link href="/fashion?category=category">SHOP BY CATEGORY</Link></h3>
                  <ul>
                    {fashionLinks.shopByCategory.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-150' : ''}`}>
                  <h3><Link href="/fashion?category=runway-archive">RUNWAY ARCHIVE</Link></h3>
                  <ul>
                    {fashionLinks.runwayArchive.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-200' : ''}`}>
                  <h3><Link href="/fashion?category=curated-collection">CURATED COLLECTION</Link></h3>
                  <ul>
                    {fashionLinks.curatedCollection.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-250' : ''}`}>
                  <h3><Link href="/fashion?category=brand-partners">BRAND PARTNERS</Link></h3>
                  <ul>
                    {fashionLinks.brandPartners.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Dropdown Menu */}
      {isAboutDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isAboutDropdownOpen ? 'active' : ''}`}
          onMouseEnter={handleAboutDropdownMouseEnter}
          onMouseLeave={handleAboutDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content">
            <div className={`furniture-column about-main-group animate-item ${runAboutAnimation ? 'animated delay-50' : ''}`}>
              <div className="about-links-container">
                <ul>
                  {aboutLinks.map((link, index) => (
                    <li key={link.name} className={`dropdown-menu-item animate-item ${runAboutAnimation ? `animated delay-${100 + index * 50}` : ''}`}>
                      <Link href={link.href}>{link.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 移动端侧边栏 */}
      {isMobileMenuOpen && (
        <>
          {/* 遮罩层 */}
          <div className={styles.mobileOverlay} onClick={closeMobileMenu} />
          
          {/* 侧边栏 */}
          <div className={styles.mobileSidebar}>
            {/* 侧边栏头部 */}
            <div className={styles.mobileSidebarHeader}>
              <div className={styles.mobileLogo}>
                <Image 
                  src="/assets/vi/Ambelie_VI_Logos.png" 
                  alt="Ambelie Logo" 
                  width={120} 
                  height={32} 
                  priority 
                />
              </div>
              <button 
                className={styles.mobileCloseButton}
                onClick={closeMobileMenu}
                aria-label="Close mobile menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* 侧边栏导航 */}
            <nav className={styles.mobileNavigation}>
              <ul>
                <li>
                  <div className={styles.mobileMenuItem}>
                    <Link href="/oriental-furniture" onClick={closeMobileMenu}>
                      ORIENTAL FURNITURE
                    </Link>
                    <button 
                      className={styles.mobileExpandButton}
                      onClick={() => toggleMobileSubmenu('oriental')}
                      aria-label="Toggle Oriental Furniture submenu"
                    >
                      <Image 
                        src={mobileMenuExpanded['oriental'] ? "/assets/icon/收缩.png" : "/assets/icon/展开.png"}
                        alt={mobileMenuExpanded['oriental'] ? "收起" : "展开"}
                        width={14}
                        height={14}
                      />
                    </button>
                  </div>
                  {mobileMenuExpanded['oriental'] && (
                    <ul className={styles.mobileSubmenu}>
                      <li><Link href="/oriental-furniture?category=screens" onClick={closeMobileMenu}>SCREENS</Link></li>
                      <li><Link href="/oriental-furniture?category=chairs" onClick={closeMobileMenu}>CHAIRS</Link></li>
                      <li><Link href="/oriental-furniture?category=tables" onClick={closeMobileMenu}>TABLES</Link></li>
                      <li><Link href="/oriental-furniture?category=cabinets-and-cupboards" onClick={closeMobileMenu}>CABINETS & CUPBOARDS</Link></li>
                      <li><Link href="/oriental-furniture?category=rugs" onClick={closeMobileMenu}>RUGS</Link></li>
                      <li><Link href="/oriental-furniture?category=others" onClick={closeMobileMenu}>OTHERS</Link></li>
                    </ul>
                  )}
                </li>
                <li>
                  <div className={styles.mobileMenuItem}>
                    <Link href="/antique-furniture" onClick={closeMobileMenu}>
                      ANTIQUE FURNITURE
                    </Link>
                    <button 
                      className={styles.mobileExpandButton}
                      onClick={() => toggleMobileSubmenu('antique')}
                      aria-label="Toggle Antique Furniture submenu"
                    >
                      <Image 
                        src={mobileMenuExpanded['antique'] ? "/assets/icon/收缩.png" : "/assets/icon/展开.png"}
                        alt={mobileMenuExpanded['antique'] ? "收起" : "展开"}
                        width={14}
                        height={14}
                      />
                    </button>
                  </div>
                  {mobileMenuExpanded['antique'] && (
                    <ul className={styles.mobileSubmenu}>
                      <li><Link href="/antique-furniture?category=seating" onClick={closeMobileMenu}>SEATING</Link></li>
                      <li><Link href="/antique-furniture?category=storage" onClick={closeMobileMenu}>STORAGE</Link></li>
                      <li><Link href="/antique-furniture?category=tables" onClick={closeMobileMenu}>TABLES</Link></li>
                      <li><Link href="/antique-furniture?category=others" onClick={closeMobileMenu}>OTHERS</Link></li>
                    </ul>
                  )}
                </li>
                <li>
                  <div className={styles.mobileMenuItem}>
                    <Link href="/lighting" onClick={closeMobileMenu}>
                      LIGHTING
                    </Link>
                    <button 
                      className={styles.mobileExpandButton}
                      onClick={() => toggleMobileSubmenu('lighting')}
                      aria-label="Toggle Lighting submenu"
                    >
                      <Image 
                        src={mobileMenuExpanded['lighting'] ? "/assets/icon/收缩.png" : "/assets/icon/展开.png"}
                        alt={mobileMenuExpanded['lighting'] ? "收起" : "展开"}
                        width={14}
                        height={14}
                      />
                    </button>
                  </div>
                  {mobileMenuExpanded['lighting'] && (
                    <ul className={styles.mobileSubmenu}>
                      <li><Link href="/lighting?category=category" onClick={closeMobileMenu}>SHOP BY CATEGORY</Link></li>
                      <li><Link href="/lighting?category=fortuny-collection" onClick={closeMobileMenu}>FORTUNY COLLECTION</Link></li>
                      <li><Link href="/lighting?category=yamagiwa-collection" onClick={closeMobileMenu}>YAMAGIWA COLLECTION</Link></li>
                    </ul>
                  )}
                </li>
                <li>
                  <div className={styles.mobileMenuItem}>
                    <Link href="/art" onClick={closeMobileMenu}>
                      ART
                    </Link>
                    <button 
                      className={styles.mobileExpandButton}
                      onClick={() => toggleMobileSubmenu('art')}
                      aria-label="Toggle Art submenu"
                    >
                      <Image 
                        src={mobileMenuExpanded['art'] ? "/assets/icon/收缩.png" : "/assets/icon/展开.png"}
                        alt={mobileMenuExpanded['art'] ? "收起" : "展开"}
                        width={14}
                        height={14}
                      />
                    </button>
                  </div>
                  {mobileMenuExpanded['art'] && (
                    <ul className={styles.mobileSubmenu}>
                      <li><Link href="/art?category=category" onClick={closeMobileMenu}>CATEGORY</Link></li>
                      <li><Link href="/art?category=oriental-art" onClick={closeMobileMenu}>ORIENTAL ART</Link></li>
                    </ul>
                  )}
                </li>
                <li>
                  <div className={styles.mobileMenuItem}>
                    <Link href="/fashion" onClick={closeMobileMenu}>
                      FASHION
                    </Link>
                    <button 
                      className={styles.mobileExpandButton}
                      onClick={() => toggleMobileSubmenu('fashion')}
                      aria-label="Toggle Fashion submenu"
                    >
                      <Image 
                        src={mobileMenuExpanded['fashion'] ? "/assets/icon/收缩.png" : "/assets/icon/展开.png"}
                        alt={mobileMenuExpanded['fashion'] ? "收起" : "展开"}
                        width={14}
                        height={14}
                      />
                    </button>
                  </div>
                  {mobileMenuExpanded['fashion'] && (
                    <ul className={styles.mobileSubmenu}>
                      <li><Link href="/fashion?category=category" onClick={closeMobileMenu}>SHOP BY CATEGORY</Link></li>
                      <li><Link href="/fashion?category=runway-archive" onClick={closeMobileMenu}>RUNWAY ARCHIVE</Link></li>
                      <li><Link href="/fashion?category=curated-collection" onClick={closeMobileMenu}>CURATED COLLECTION</Link></li>
                      <li><Link href="/fashion?category=brand-partners" onClick={closeMobileMenu}>BRAND PARTNERS</Link></li>
                    </ul>
                  )}
                </li>
                <li>
                  <Link href="/exhibitions" onClick={closeMobileMenu}>
                    EXHIBITION
                  </Link>
                </li>
                <li>
                  <Link href="/projects" onClick={closeMobileMenu}>
                    PROJECT
                  </Link>
                </li>
                <li>
                  <Link href="/press" onClick={closeMobileMenu}>
                    PRESS
                  </Link>
                </li>
                <li>
                  <div className={styles.mobileMenuItem}>
                    <Link href="/about" onClick={closeMobileMenu}>
                      ABOUT
                    </Link>
                    <button 
                      className={styles.mobileExpandButton}
                      onClick={() => toggleMobileSubmenu('about')}
                      aria-label="Toggle About submenu"
                    >
                      <Image 
                        src={mobileMenuExpanded['about'] ? "/assets/icon/收缩.png" : "/assets/icon/展开.png"}
                        alt={mobileMenuExpanded['about'] ? "收起" : "展开"}
                        width={14}
                        height={14}
                      />
                    </button>
                  </div>
                  {mobileMenuExpanded['about'] && (
                    <ul className={styles.mobileSubmenu}>
                      <li><Link href="/about" onClick={closeMobileMenu}>OUR STORY</Link></li>
                      <li><Link href="/contact" onClick={closeMobileMenu}>CONTACT</Link></li>
                      <li><Link href="/about/shanghai" onClick={closeMobileMenu}>AMBELIE SHANGHAI</Link></li>
                      <li><Link href="/about/hangzhou" onClick={closeMobileMenu}>AMBELIE HANGZHOU</Link></li>
                    </ul>
                  )}
                </li>
              </ul>
            </nav>

            {/* 侧边栏底部 */}
            <div className={styles.mobileSidebarFooter}>
              <div className={styles.mobileSearch}>
                <Link href="/search" onClick={closeMobileMenu}>
                  <Search size={20} />
                  <span>SEARCH</span>
                </Link>
              </div>
              <div className={styles.mobileUserMenu}>
                <UserMenu 
                  user={user} 
                  onSignOut={handleSignOut}
                  iconColor="#333"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}