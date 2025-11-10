'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import styles from './AntiqueFurniture.module.css';

// --- TYPE DEFINITIONS ---
interface ImageItem {
  url: string;
  alternativeText?: string | null;
}

interface Product {
  id: number;
  slug: string;
  name: string;
  period: string;
  main_image?: ImageItem | null;
  hover_image?: ImageItem | null;
}

interface SubCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  subItems?: SubCategoryItem[];
}

interface SubCategoryItem {
  id: number;
  name: string;
  slug: string;
  parentSlug: string;
}

// --- COMPONENT ---
function AntiqueFurnitureContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('category') || 'seating';
    }
    return 'seating';
  });
  const [activeSubCategory, setActiveSubCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('subcategory') || 'all';
    }
    return 'all';
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldResetSubCategory, setShouldResetSubCategory] = useState(false);
  const requestIdRef = useRef(0);

  const searchParams = useSearchParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  // 处理URL参数变化
  useEffect(() => {
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    
    if (category) {
      setActiveCategory(category);
      // 当从URL参数设置状态时，禁用重置逻辑
      setShouldResetSubCategory(false);
      if (subcategory) {
        setActiveSubCategory(subcategory);
      } else {
        setActiveSubCategory('all');
      }
    }
  }, [searchParams]);

  // 获取古董家具相关的子分类
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        // 获取古董家具相关的子分类和二级分类
        const antiqueCategories = [
          { 
            id: 1, 
            name: 'SEATING', 
            slug: 'seating', 
            description: 'Antique chairs, sofas and seating furniture',
            subItems: [
              { id: 11, name: 'All', slug: 'all', parentSlug: 'seating' },
              { id: 12, name: 'Chairs', slug: 'antique-chairs', parentSlug: 'seating' },
              { id: 13, name: 'Armchairs', slug: 'armchairs', parentSlug: 'seating' },
              { id: 14, name: 'Sofa', slug: 'sofa', parentSlug: 'seating' }
            ]
          },
          { 
            id: 2, 
            name: 'STORAGE', 
            slug: 'storage', 
            description: 'Antique cabinets, chests and storage solutions',
            subItems: [
              { id: 21, name: 'All', slug: 'all', parentSlug: 'storage' },
              { id: 22, name: 'Cabinets', slug: 'cabinets', parentSlug: 'storage' },
              { id: 23, name: 'Drawers', slug: 'drawers', parentSlug: 'storage' },
              { id: 24, name: 'Night Stands', slug: 'night-stands', parentSlug: 'storage' }
            ]
          },
          { 
            id: 3, 
            name: 'TABLES', 
            slug: 'tables', 
            description: 'Antique dining, coffee and side tables',
            subItems: [
              { id: 31, name: 'All', slug: 'all', parentSlug: 'tables' },
              { id: 32, name: 'Dining Tables', slug: 'dining-tables', parentSlug: 'tables' },
              { id: 33, name: 'Coffee Tables', slug: 'coffee-tables', parentSlug: 'tables' },
              { id: 34, name: 'Side Tables', slug: 'side-tables', parentSlug: 'tables' }
            ]
          },
          { 
            id: 4, 
            name: 'OTHERS', 
            slug: 'others', 
            description: 'Other antique furniture pieces',
            subItems: [
              { id: 41, name: 'All', slug: 'all', parentSlug: 'others' },
              { id: 42, name: 'Designer Collections', slug: 'designer-collections', parentSlug: 'others' },
              { id: 43, name: 'Others', slug: 'others-1', parentSlug: 'others' }
            ]
          }
        ];
        
        setSubCategories(antiqueCategories);
      } catch (err) {
        console.error('Failed to fetch subcategories:', err);
        setError('Failed to load categories');
      }
    };

    fetchSubCategories();
  }, []);

  // 当切换一级分类时，根据标志决定是否重置二级分类
  useEffect(() => {
    if (shouldResetSubCategory) {
      setActiveSubCategory('all');
      setShouldResetSubCategory(false);
    }
  }, [activeCategory, shouldResetSubCategory]);

  // 获取产品数据
  useEffect(() => {
    const fetchProducts = async () => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null); // 重置错误状态
      
      try {
        // 根据当前活动分类和子分类构建查询
        let query = '';
        
        // 处理'All'选项的查询逻辑
        if (activeSubCategory === 'all') {
          // 根据主分类显示所有相关产品
          if (activeCategory === 'seating') {
            query = `filters[category][slug][$in][0]=antique-chairs&filters[category][slug][$in][1]=armchairs&filters[category][slug][$in][2]=sofa&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'storage') {
            query = `filters[category][slug][$in][0]=cabinets&filters[category][slug][$in][1]=drawers&filters[category][slug][$in][2]=night-stands&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'tables') {
            query = `filters[category][slug][$in][0]=dining-tables&filters[category][slug][$in][1]=coffee-tables&filters[category][slug][$in][2]=side-tables&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'others') {
            query = `filters[category][slug][$in][0]=designer-collections&filters[category][slug][$in][1]=others-1&populate[0]=main_image&populate[1]=hover_image`;
          }
        } else if (activeSubCategory && activeSubCategory !== 'all') {
          // 对于具体的子分类，使用完整的子分类slug查询
          query = `filters[category][slug][$eq]=${activeSubCategory}&populate[0]=main_image&populate[1]=hover_image`;
        } else if (activeCategory) {
          // 如果只选择了主分类，显示该分类下的所有产品
          if (activeCategory === 'seating') {
            query = `filters[category][slug][$in][0]=antique-chairs&filters[category][slug][$in][1]=armchairs&filters[category][slug][$in][2]=sofa&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'storage') {
            query = `filters[category][slug][$in][0]=cabinets&filters[category][slug][$in][1]=drawers&filters[category][slug][$in][2]=night-stands&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'tables') {
            query = `filters[category][slug][$in][0]=dining-tables&filters[category][slug][$in][1]=coffee-tables&filters[category][slug][$in][2]=side-tables&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'others') {
            query = `filters[category][slug][$in][0]=designer-collections&filters[category][slug][$in][1]=others-1&populate[0]=main_image&populate[1]=hover_image`;
          } else {
            // 对于其他主分类，暂时显示空结果
            if (currentRequestId === requestIdRef.current) {
              setProducts([]);
              setLoading(false);
            }
            return;
          }
        }
        
        if (!query) {
          if (currentRequestId === requestIdRef.current) {
            setProducts([]);
            setLoading(false);
          }
          return;
        }
        // 统一按后端更新时间倒序排序（最新修改的产品排在最前）
        query += `&sort[0]=updatedAt:desc`;

        console.log('Antique furniture page query:', query);
        console.log('Active category:', activeCategory, 'Active subcategory:', activeSubCategory);
        
        const response = await fetch(`${API_URL}/api/products?${query}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // 如果是404或其他错误，不抛出异常，而是设置空数组
          console.warn(`API request failed with status ${response.status}`);
          if (currentRequestId === requestIdRef.current) {
            setProducts([]);
          }
          return;
        }

        const data = await response.json();
        
        // 检查数据结构是否正确
        if (!data || !Array.isArray(data.data)) {
          console.warn('Invalid data structure received from API');
          if (currentRequestId === requestIdRef.current) {
            setProducts([]);
          }
          return;
        }
        
        // 转换产品数据，参考category页面的实现
        const transformedProducts: Product[] = data.data.map((product: any) => {
          try {
            return {
              id: product.id,
              slug: product.slug || '',
              name: product.name || 'Unnamed Product',
              period: product.period || '',
              main_image: product.main_image ? {
                url: product.main_image.url?.startsWith('http') 
                  ? product.main_image.url 
                  : `${API_URL}${product.main_image.url}`,
                alternativeText: product.main_image.alternativeText || '',
              } : null,
              hover_image: product.hover_image ? {
                url: product.hover_image.url?.startsWith('http') 
                  ? product.hover_image.url 
                  : `${API_URL}${product.hover_image.url}`,
                alternativeText: product.hover_image.alternativeText || '',
              } : null,
            };
          } catch (productError) {
            console.warn('Error processing product:', product, productError);
            return null;
          }
        }).filter(Boolean) as Product[]; // 过滤掉null值

        if (currentRequestId === requestIdRef.current) {
          setProducts(transformedProducts);
        } else {
          console.log('Ignored stale products response for', { activeCategory, activeSubCategory });
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
        // 不设置错误状态，而是显示空产品列表
        if (currentRequestId === requestIdRef.current) {
          setProducts([]);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    // 只有当activeCategory存在时才获取产品
    if (activeCategory) {
      fetchProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [activeCategory, activeSubCategory, API_URL]);

  const handleCategoryChange = (categorySlug: string) => {
    setShouldResetSubCategory(true); // 标记需要重置子分类
    setActiveCategory(categorySlug);
    setOpenDropdown(null); // 关闭下拉菜单
    
    // 更新URL为query参数
    router.replace(`/antique-furniture?category=${categorySlug}`);
  };

  const handleSubCategoryChange = (subCategorySlug: string, parentCategorySlug?: string) => {
    // 如果提供了父分类，先设置父分类
    if (parentCategorySlug && parentCategorySlug !== activeCategory) {
      setActiveCategory(parentCategorySlug);
    }
    setActiveSubCategory(subCategorySlug);
    setOpenDropdown(null); // 关闭下拉菜单
    
    // 更新URL为query参数
    if (subCategorySlug !== 'all' && parentCategorySlug) {
      router.replace(`/antique-furniture?category=${parentCategorySlug}&subcategory=${subCategorySlug}`);
    } else if (parentCategorySlug) {
      router.replace(`/antique-furniture?category=${parentCategorySlug}`);
    }
  };

  const handleMouseEnter = (categorySlug: string) => {
    setOpenDropdown(categorySlug);
  };

  const handleMouseLeave = () => {
    setOpenDropdown(null);
  };

  const handleTouchStart = (categorySlug: string) => {
    // 在移动端，触摸时切换下拉菜单状态
    if (openDropdown === categorySlug) {
      setOpenDropdown(null);
    } else {
      // 关闭其他打开的下拉菜单
      setOpenDropdown(categorySlug);
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(`.${styles.categoryTabContainer}`)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdown]);

  // 获取当前显示的导航标题
  const getCurrentNavTitle = () => {
    const currentCategory = subCategories.find(cat => cat.slug === activeCategory);
    if (!currentCategory) return 'ANTIQUE FURNITURE';
    
    if (activeSubCategory === 'all') {
      return currentCategory.name;
    } else {
      const currentSubItem = currentCategory.subItems?.find(item => item.slug === activeSubCategory);
      return currentSubItem ? `${currentCategory.name} - ${currentSubItem.name.toUpperCase()}` : currentCategory.name;
    }
  };

  // 获取分类按钮显示的文字
  const getCategoryButtonText = (category: SubCategory) => {
    if (activeCategory === category.slug && activeSubCategory && activeSubCategory !== 'all') {
      const currentSubItem = category.subItems?.find(item => item.slug === activeSubCategory);
      return currentSubItem ? `${category.name}-${currentSubItem.name}` : category.name;
    }
    return category.name;
  };



  return (
    <main className={styles.container}>
      {/* 页面标题 */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>ANTIQUE FURNITURE</h1>
        <p className={styles.pageDescription}>
          Explore our carefully curated collection of authentic antique furniture pieces, 
          each with its own unique history and timeless character.
        </p>
      </header>

      {/* 子分类导航 */}
      <nav className={styles.categoryNav}>
        <div className={styles.categoryTabs}>
          {subCategories.map((category) => (
            <div 
              key={category.id} 
              className={styles.categoryTabContainer}
              onMouseEnter={() => handleMouseEnter(category.slug)}
              onMouseLeave={handleMouseLeave}
              // 移除容器级触摸事件，避免首次点击拦截导航
            >
              <button
                className={`${styles.categoryTab} ${
                  activeCategory === category.slug ? styles.active : ''
                }`}
                onClick={() => handleCategoryChange(category.slug)}
              >
                {getCategoryButtonText(category)}
              </button>
              
              {/* 下拉菜单指示器，仅用于展开/收起下拉 */}
              <span 
                className={`${styles.dropdownIndicator} ${
                  activeCategory === category.slug ? styles.active : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTouchStart(category.slug);
                }}
              >
                ▼
              </span>
              
              {/* 下拉菜单 */}
              {openDropdown === category.slug && category.subItems && (
                <div className={styles.dropdown}>
                  {category.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      className={`${styles.dropdownItem} ${
                        activeCategory === category.slug && activeSubCategory === subItem.slug ? styles.active : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // 传递父分类参数，确保跨分类点击能正确设置
                        handleSubCategoryChange(subItem.slug, category.slug);
                      }}
                    >
                      {subItem.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* 产品网格 */}
      <section className={styles.productsSection}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading products...</p>
          </div>
        ) : (
          <div className={styles.productGrid}>
            {products.length > 0 ? (
              products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className={styles.noProducts}>
                <p>No products available in this category at the moment.</p>
                <p className={styles.noProductsSubtext}>
                  We're constantly updating our collection. Please check back soon or explore other categories.
                </p>
                <Link href="/" className={styles.browseLink}>
                  ← Back to Home
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

    </main>
  );
}

export default function AntiqueFurniturePage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    }>
      <AntiqueFurnitureContent />
    </Suspense>
  );
}