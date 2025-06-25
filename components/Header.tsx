'use client'; // 将 Header 标记为客户端组件

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react'; // 引入 useState, useEffect, useRef
import { usePathname } from 'next/navigation'; // 引入 usePathname 来获取当前路径
import UserMenu from './UserMenu';
import { Search } from 'lucide-react'; // Import Search Icon
// import { useAuthStore } from '../lib/stores/authStore'; // 临时注释，避免模块错误

// 注意：Mega Menu 的动态交互 (如鼠标悬停显示、分类切换等) 
// 将需要客户端 JavaScript 逻辑，我们稍后会添加。
// 目前这只是结构和样式的迁移。

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  // Furniture Dropdown States
  const [isFurnitureDropdownOpen, setIsFurnitureDropdownOpen] = useState(false);
  const [runFurnitureAnimation, setRunFurnitureAnimation] = useState(false); 
  const furnitureDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Decor Dropdown States
  const [isDecorDropdownOpen, setIsDecorDropdownOpen] = useState(false);
  const [runDecorAnimation, setRunDecorAnimation] = useState(false);
  const decorDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fashion Dropdown States
  const [isFashionDropdownOpen, setIsFashionDropdownOpen] = useState(false);
  const [runFashionAnimation, setRunFashionAnimation] = useState(false);
  const fashionDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // About Dropdown States
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  const [runAboutAnimation, setRunAboutAnimation] = useState(false);
  const aboutDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hover states for non-dropdown menu items
  const [isExhibitionsHovered, setIsExhibitionsHovered] = useState(false);
  const [isProjectsHovered, setIsProjectsHovered] = useState(false);
  const [isSearchHovered, setIsSearchHovered] = useState(false);

  const pathname = usePathname(); // 获取当前路径
  const isHomepage = pathname === '/'; // Check if it's the homepage

  // 用户状态管理 (临时模拟数据)
  // const { user, isAuthenticated, logout } = useAuthStore();
  const [mockUser] = useState({
    id: '1',
    email: 'user@example.com', 
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatar: undefined
  });
  const isAuthenticated = true; // 临时设为true来测试UI
  
  const handleSignOut = () => {
    // logout();
    console.log('Sign out');
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
      if (furnitureDropdownTimeoutRef.current) {
        clearTimeout(furnitureDropdownTimeoutRef.current);
      }
      if (decorDropdownTimeoutRef.current) {
        clearTimeout(decorDropdownTimeoutRef.current);
      }
      if (fashionDropdownTimeoutRef.current) {
        clearTimeout(fashionDropdownTimeoutRef.current);
      }
      if (aboutDropdownTimeoutRef.current) {
        clearTimeout(aboutDropdownTimeoutRef.current);
      }
    };
  }, []);

  // Effect to trigger animations for Furniture dropdown columns
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isFurnitureDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunFurnitureAnimation(true);
      }, 20);
    } else {
      setRunFurnitureAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isFurnitureDropdownOpen]);

  // Effect to trigger animations for Decor dropdown columns
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isDecorDropdownOpen) {
      animationTimer = setTimeout(() => {
        setRunDecorAnimation(true);
      }, 20);
    } else {
      setRunDecorAnimation(false);
    }
    return () => clearTimeout(animationTimer);
  }, [isDecorDropdownOpen]);

  // Effect to trigger animations for Fashion dropdown columns
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

  // Effect to trigger animations for About dropdown columns
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

  // Furniture Event Handlers
  const handleFurnitureNavMouseEnter = () => {
    if (furnitureDropdownTimeoutRef.current) clearTimeout(furnitureDropdownTimeoutRef.current);
    if (isDecorDropdownOpen) setIsDecorDropdownOpen(false); // Close other dropdowns
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false); // Close other dropdowns
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false); // Close other dropdowns
    setIsExhibitionsHovered(false);
    setIsProjectsHovered(false);
    setIsFurnitureDropdownOpen(true);
  };
  const handleFurnitureNavMouseLeave = () => {
    furnitureDropdownTimeoutRef.current = setTimeout(() => setIsFurnitureDropdownOpen(false), 200);
  };
  const handleFurnitureDropdownMouseEnter = () => {
    if (furnitureDropdownTimeoutRef.current) clearTimeout(furnitureDropdownTimeoutRef.current);
  };
  const handleFurnitureDropdownMouseLeave = () => setIsFurnitureDropdownOpen(false);

  // Decor Event Handlers
  const handleDecorNavMouseEnter = () => {
    if (decorDropdownTimeoutRef.current) clearTimeout(decorDropdownTimeoutRef.current);
    if (isFurnitureDropdownOpen) setIsFurnitureDropdownOpen(false); // Close other dropdowns
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false); // Close other dropdowns
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false); // Close other dropdowns
    setIsExhibitionsHovered(false);
    setIsProjectsHovered(false);
    setIsDecorDropdownOpen(true);
  };
  const handleDecorNavMouseLeave = () => {
    decorDropdownTimeoutRef.current = setTimeout(() => setIsDecorDropdownOpen(false), 200);
  };
  const handleDecorDropdownMouseEnter = () => {
    if (decorDropdownTimeoutRef.current) clearTimeout(decorDropdownTimeoutRef.current);
  };
  const handleDecorDropdownMouseLeave = () => setIsDecorDropdownOpen(false);

  // Fashion Event Handlers
  const handleFashionNavMouseEnter = () => {
    if (fashionDropdownTimeoutRef.current) clearTimeout(fashionDropdownTimeoutRef.current);
    if (isFurnitureDropdownOpen) setIsFurnitureDropdownOpen(false);
    if (isDecorDropdownOpen) setIsDecorDropdownOpen(false);
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false);
    setIsExhibitionsHovered(false);
    setIsProjectsHovered(false);
    setIsFashionDropdownOpen(true);
  };
  const handleFashionNavMouseLeave = () => {
    fashionDropdownTimeoutRef.current = setTimeout(() => setIsFashionDropdownOpen(false), 200);
  };
  const handleFashionDropdownMouseEnter = () => {
    if (fashionDropdownTimeoutRef.current) clearTimeout(fashionDropdownTimeoutRef.current);
  };
  const handleFashionDropdownMouseLeave = () => setIsFashionDropdownOpen(false);

  // About Event Handlers
  const handleAboutNavMouseEnter = () => {
    if (aboutDropdownTimeoutRef.current) clearTimeout(aboutDropdownTimeoutRef.current);
    if (isFurnitureDropdownOpen) setIsFurnitureDropdownOpen(false);
    if (isDecorDropdownOpen) setIsDecorDropdownOpen(false);
    if (isFashionDropdownOpen) setIsFashionDropdownOpen(false);
    setIsExhibitionsHovered(false);
    setIsProjectsHovered(false);
    setIsAboutDropdownOpen(true);
  };
  const handleAboutNavMouseLeave = () => {
    aboutDropdownTimeoutRef.current = setTimeout(() => setIsAboutDropdownOpen(false), 200);
  };
  const handleAboutDropdownMouseEnter = () => {
    if (aboutDropdownTimeoutRef.current) clearTimeout(aboutDropdownTimeoutRef.current);
  };
  const handleAboutDropdownMouseLeave = () => setIsAboutDropdownOpen(false);

  // Handlers for simple menu items
  const handleExhibitionsEnter = () => {
    setIsFurnitureDropdownOpen(false);
    setIsDecorDropdownOpen(false);
    setIsFashionDropdownOpen(false);
    setIsAboutDropdownOpen(false);
    setIsProjectsHovered(false);
    setIsExhibitionsHovered(true);
  };

  const handleProjectsEnter = () => {
    setIsFurnitureDropdownOpen(false);
    setIsDecorDropdownOpen(false);
    setIsFashionDropdownOpen(false);
    setIsAboutDropdownOpen(false);
    setIsExhibitionsHovered(false);
    setIsProjectsHovered(true);
  };

  const handleSimpleLinkMouseLeave = () => {
    setIsExhibitionsHovered(false);
    setIsProjectsHovered(false);
  };

  const isHeaderConditionallyActive = isScrolled;

  let headerClasses = ['site-header'];

  if (!isHomepage || isScrolled) {
    headerClasses.push('scrolled');
  }

  if (isFurnitureDropdownOpen || isDecorDropdownOpen || isFashionDropdownOpen || isAboutDropdownOpen || isExhibitionsHovered || isProjectsHovered) {
    if (!headerClasses.includes('menu-active')) {
        headerClasses.push('menu-active');
    }
  }

  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const headerIsActive = headerClasses.includes('scrolled') || headerClasses.includes('menu-active') || isHeaderHovered;

  const headerClassName = headerClasses.join(' ').trim();

  const logoImageClassName = `logo-${!isScrolled && isHomepage && !isFurnitureDropdownOpen && !isDecorDropdownOpen && !isFashionDropdownOpen && !isAboutDropdownOpen && !isExhibitionsHovered && !isProjectsHovered ? 'white' : 'dark'}`;

  const searchIconColor = headerIsActive ? (isSearchHovered ? '#333' : 'black') : (isSearchHovered ? 'rgba(255, 255, 255, 0.8)' : 'white');

  const furnitureLinks = {
    oriental: [
      { name: 'SCREENS', href: '/category/screens' },
      { name: 'CHAIRS', href: '/category/oriental-chairs' },
      { name: 'TABLES', href: '/category/oriental-tables' },
      { name: 'CABINETS & CUPBOARDS', href: '/category/cabinets-cupboards' },
      { name: 'RUGS', href: '/category/rugs' },
      { name: 'OTHERS', href: '/category/oriental-others' },
    ],
    antique: {
      seating: [
        { name: 'CHAIRS', href: '/category/chairs' },
        { name: 'ARMCHAIRS', href: '/category/armchairs' },
        { name: 'SOFA', href: '/category/sofa' },
        { name: 'DINING ROOM CHAIRS', href: '/category/dining-room-chairs' },
      ],
      storage: [
        { name: 'CABINETS', href: '/category/cabinets' },
        { name: 'DRESSERS', href: '/category/dressers' },
        { name: 'NIGHT STANDS', href: '/category/night-stands' },
      ],
      tables: [
        { name: 'DINING TABLES', href: '/category/dining-tables' },
        { name: 'COFFEE TABLES', href: '/category/coffee-tables' },
        { name: 'SIDE TABLES', href: '/category/side-tables' },
      ],
      others: [
        { name: 'DESIGNERS', href: '/category/designers' },
      ],
    },
  };

  const decorLinks = {
    lighting: {
      regular: [
        { name: 'WALL LIGHTS', href: '/category/wall-lights' },
        { name: 'TABLE LAMPS', href: '/category/table-lamps' },
        { name: 'FLOOR LAMPS', href: '/category/floor-lamps' },
        { name: 'PENDANT', href: '/category/pendant' },
      ],
      fortuny: [
        { name: 'SILK LAMPS', href: '/category/silk-lamps' },
        { name: 'GLASS LAMPS', href: '/category/glass-lamps' },
      ],
      yamagiwa: [
        { name: 'FRANK LLOYD WRIGHT', href: '/category/frank-lloyd-wright' },
        { name: 'JACOBSSON', href: '/category/jacobsson' },
      ],
    },
    art: {
      regular: [
        { name: 'SCULPTURE', href: '/category/sculpture' },
        { name: 'PAINTINGS', href: '/category/paintings' },
        { name: 'DRAWINGS & WATERCOLOR', href: '/category/drawings-watercolor' }, 
      ],
      orientalArt: [
        { name: 'CALLIGRAPHY', href: '/category/calligraphy' },
        { name: 'EMBROIDERY', href: '/category/embroidery' },
      ],
    },
  };

  const fashionLinks = {
    regular: [
      { name: 'TOPS', href: '/category/tops' },
      { name: 'BOTTOMS', href: '/category/bottoms' },
      { name: 'DRESSES', href: '/category/dresses' },
      { name: 'BAGS', href: '/category/bags' },
      { name: 'ACCESSORIES', href: '/category/accessories' },
    ],
    fortuny: [
      { name: 'JACKETS & EVENING COATS', href: '/category/jackets-evening-coats' },
      { name: 'SCARVES', href: '/category/scarves' },
      { name: 'BAGS', href: '/category/fortuny-bags' },
      { name: 'DELPHOS DRESSES', href: '/category/delphos-dresses' },
    ],
    tba: [
      { name: 'CLOTHINGS', href: '/category/clothings' },
      { name: 'ACCESSORIES', href: '/category/tba-accessories' },
    ],
    runway: [
      // Currently no sub-items in markdown, will render as a title.
      // Add items here like: { name: 'ITEM NAME', href: '/category/item'}
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
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        <div 
          className="header-search-icon"
          onMouseEnter={() => setIsSearchHovered(true)}
          onMouseLeave={() => setIsSearchHovered(false)}
        >
          <Search size={20} className="search-icon-svg" style={{ color: searchIconColor }} />
          {isSearchHovered && <span className="search-text" style={{ color: searchIconColor }}>SEARCH</span>}
        </div>
        <nav className="main-navigation left-navigation">
          <ul>
            <li
              className={`menu-item ${pathname === '/furniture' || pathname.startsWith('/furniture/') ? 'active' : ''} ${isFurnitureDropdownOpen ? 'dropdown-active' : ''}`}
              onMouseEnter={handleFurnitureNavMouseEnter}
              onMouseLeave={handleFurnitureNavMouseLeave}
            >
              <Link href="/furniture">FURNITURE</Link>
            </li>
            <li
              className={`menu-item ${pathname === '/decor' || pathname.startsWith('/decor/') ? 'active' : ''} ${isDecorDropdownOpen ? 'dropdown-active' : ''}`}
              onMouseEnter={handleDecorNavMouseEnter}
              onMouseLeave={handleDecorNavMouseLeave}
            >
              <Link href="/decor">DECOR</Link>
            </li>
            <li
              className={`menu-item ${pathname === '/fashion' || pathname.startsWith('/fashion/') ? 'active' : ''} ${isFashionDropdownOpen ? 'dropdown-active' : ''}`}
              onMouseEnter={handleFashionNavMouseEnter}
              onMouseLeave={handleFashionNavMouseLeave}
            >
              <Link href="/fashion">FASHION</Link>
            </li>
          </ul>
        </nav>
        
        <div className="logo">
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
        
        <nav className="main-navigation right-navigation">
          <ul>
            <li 
              className={`menu-item ${pathname === '/exhibitions' || pathname.startsWith('/exhibitions/') ? 'active' : ''} ${isExhibitionsHovered ? 'dropdown-active' : ''}`}
              onMouseEnter={handleExhibitionsEnter}
              onMouseLeave={handleSimpleLinkMouseLeave}
            >
              <Link href="/exhibitions">EXHIBITIONS</Link>
            </li>
            <li 
              className={`menu-item ${pathname === '/projects' || pathname.startsWith('/projects/') ? 'active' : ''} ${isProjectsHovered ? 'dropdown-active' : ''}`}
              onMouseEnter={handleProjectsEnter}
              onMouseLeave={handleSimpleLinkMouseLeave}
            >
              <Link href="/projects">PROJECTS</Link>
            </li>
            <li 
              className={`menu-item ${pathname === '/about' || pathname.startsWith('/about/') ? 'active' : ''} ${isAboutDropdownOpen ? 'dropdown-active' : ''}`}
              onMouseEnter={handleAboutNavMouseEnter}
              onMouseLeave={handleAboutNavMouseLeave}
            >
              <a href="#" onClick={(e) => e.preventDefault()}>ABOUT</a>
            </li>
            <li className="menu-item user-menu-item">
              <UserMenu 
                user={isAuthenticated ? mockUser : null} 
                onSignOut={handleSignOut}
              />
            </li>
          </ul>
        </nav>
      </header>

      {/* Furniture Dropdown Menu */}
      {isFurnitureDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isFurnitureDropdownOpen ? 'active' : ''}`}
          onMouseEnter={handleFurnitureDropdownMouseEnter}
          onMouseLeave={handleFurnitureDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content">
            <div className={`furniture-column oriental-group animate-item ${runFurnitureAnimation ? 'animated delay-50' : ''}`}>
              <h2><Link href="/furniture/oriental">ORIENTAL</Link></h2>
              <ul>
                {furnitureLinks.oriental.map((link) => (
                  <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                ))}
              </ul>
            </div>
            <div className={`furniture-column antique-group animate-item ${runFurnitureAnimation ? 'animated delay-100' : ''}`}>
              <h2><Link href="/furniture/antique">ANTIQUE</Link></h2>
              <div className="antique-sub-columns-container">
                <div className={`furniture-sub-column animate-item ${runFurnitureAnimation ? 'animated delay-150' : ''}`}>
                  <h3><Link href="/furniture/antique/seating">SEATING</Link></h3>
                  <ul>
                    {furnitureLinks.antique.seating.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runFurnitureAnimation ? 'animated delay-200' : ''}`}>
                  <h3><Link href="/furniture/antique/storage">STORAGE</Link></h3>
                  <ul>
                    {furnitureLinks.antique.storage.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runFurnitureAnimation ? 'animated delay-250' : ''}`}>
                  <h3><Link href="/furniture/antique/tables">TABLES</Link></h3>
                  <ul>
                    {furnitureLinks.antique.tables.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className={`furniture-sub-column animate-item ${runFurnitureAnimation ? 'animated delay-300' : ''}`}>
                  <h3><Link href="/furniture/antique/others">OTHERS</Link></h3>
                  <ul>
                    {furnitureLinks.antique.others.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decor Dropdown Menu */}
      {isDecorDropdownOpen && (
        <div
          className={`furniture-dropdown-container ${isDecorDropdownOpen ? 'active' : ''}`} 
          onMouseEnter={handleDecorDropdownMouseEnter}
          onMouseLeave={handleDecorDropdownMouseLeave}
        >
          <div className="furniture-dropdown-content"> {/* Main flex container for DECOR */}
            {/* Group 1: LIGHTING (contains 3 columns internally) */}
            <div className={`furniture-column lighting-group animate-item ${runDecorAnimation ? 'animated delay-50' : ''}`}>
              <h2><Link href="/decor/lighting">LIGHTING</Link></h2>
              <div className="decor-sub-columns-container"> 
                {/* Column 1.1: Regular Lighting */} 
                <div className={`furniture-sub-column animate-item ${runDecorAnimation ? 'animated delay-100' : ''}`}>
                  <ul>
                    {decorLinks.lighting.regular.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                {/* Column 1.2: FORTUNY COLLECTION */}
                <div className={`furniture-sub-column animate-item ${runDecorAnimation ? 'animated delay-150' : ''}`}>
                  <h3><Link href="/decor/lighting/fortuny">FORTUNY COLLECTION</Link></h3>
                  <ul>
                    {decorLinks.lighting.fortuny.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                {/* Column 1.3: YAMAGIWA COLLECTION */}
                <div className={`furniture-sub-column animate-item ${runDecorAnimation ? 'animated delay-200' : ''}`}>
                  <h3><Link href="/decor/lighting/yamagiwa">YAMAGIWA COLLECTION</Link></h3>
                  <ul>
                    {decorLinks.lighting.yamagiwa.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Group 2: ART (contains 2 columns internally) */}
            <div className={`furniture-column art-group animate-item ${runDecorAnimation ? 'animated delay-250' : ''}`}>
              <h2><Link href="/decor/art">ART</Link></h2>
              <div className="decor-sub-columns-container"> 
                {/* Column 2.1: Regular Art */} 
                <div className={`furniture-sub-column animate-item ${runDecorAnimation ? 'animated delay-300' : ''}`}>
                  <ul>
                    {decorLinks.art.regular.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                {/* Column 2.2: ORIENTAL ART */}
                <div className={`furniture-sub-column animate-item ${runDecorAnimation ? 'animated delay-350' : ''}`}>
                  <h3><Link href="/decor/art/oriental-art">ORIENTAL ART</Link></h3>
                  <ul>
                    {decorLinks.art.orientalArt.map((link) => (
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
          <div className="furniture-dropdown-content"> {/* Main flex container for FASHION */}
            {/* Single H2 Title for FASHION */}
            <div className={`furniture-column fashion-main-group animate-item ${runFashionAnimation ? 'animated delay-50' : ''}`}>
              <h2><Link href="/fashion">FASHION</Link></h2>
              {/* Container for the 4 columns */}
              <div className="fashion-columns-container"> 
                {/* Column 1: Regular Fashion */}
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-100' : ''}`}>
                  {/* No H3 for regular items */}
                  <ul>
                    {fashionLinks.regular.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                {/* Column 2: FORTUNY COLLECTION */}
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-150' : ''}`}>
                  <h3><Link href="/fashion/fortuny">FORTUNY COLLECTION</Link></h3>
                  <ul>
                    {fashionLinks.fortuny.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                {/* Column 3: T.BA COLLECTION */}
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-200' : ''}`}>
                  <h3><Link href="/fashion/tba">T.BA COLLECTION</Link></h3>
                  <ul>
                    {fashionLinks.tba.map((link) => (
                      <li key={link.name} className="dropdown-menu-item"><Link href={link.href}>{link.name}</Link></li>
                    ))}
                  </ul>
                </div>
                {/* Column 4: RUNWAY COLLECTION */}
                <div className={`furniture-sub-column animate-item ${runFashionAnimation ? 'animated delay-250' : ''}`}>
                  <h3><Link href="/fashion/runway">RUNWAY COLLECTION</Link></h3>
                  <ul>
                    {fashionLinks.runway.map((link: { name: string; href: string }) => (
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
    </>
  );
} 