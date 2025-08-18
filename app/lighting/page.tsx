'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import styles from './Lighting.module.css';

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
function LightingContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (typeof window === 'undefined') return 'category';
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'category';
  });
  const [activeSubCategory, setActiveSubCategory] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    const params = new URLSearchParams(window.location.search);
    return params.get('subcategory') || 'all';
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldResetSubCategory, setShouldResetSubCategory] = useState(false);
  const requestIdRef = useRef(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  // 获取灯具相关的子分类
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        // 获取灯具相关的子分类和二级分类
        const lightingCategories = [
          { 
            id: 1, 
            name: 'CATEGORY', 
            slug: 'category', 
            description: 'Shop by lighting category',
            subItems: [
              { id: 11, name: 'All', slug: 'all', parentSlug: 'category' },
              { id: 12, name: 'Wall Lights', slug: 'wall-lights', parentSlug: 'category' },
              { id: 13, name: 'Table Lamps', slug: 'table-lamps', parentSlug: 'category' },
              { id: 14, name: 'Floor Lamps', slug: 'floor-lamps', parentSlug: 'category' },
              { id: 15, name: 'Pendant', slug: 'pendant', parentSlug: 'category' }
            ]
          },
          { 
            id: 2, 
            name: 'FORTUNY COLLECTION', 
            slug: 'fortuny-collection', 
            description: 'Fortuny designer lighting collection',
            subItems: [
              { id: 21, name: 'All', slug: 'all', parentSlug: 'fortuny-collection' },
              { id: 22, name: 'Silk Lamps', slug: 'silk-lamps', parentSlug: 'fortuny-collection' },
              { id: 23, name: 'Glass Lamps', slug: 'glass-lamps', parentSlug: 'fortuny-collection' }
            ]
          },
          { 
            id: 3, 
            name: 'YAMAGIWA COLLECTION', 
            slug: 'yamagiwa-collection', 
            description: 'Yamagiwa designer lighting collection',
            subItems: [
              { id: 31, name: 'All', slug: 'all', parentSlug: 'yamagiwa-collection' },
              { id: 32, name: 'Frank Lloyd Wright Collection', slug: 'frank-lloyd-wright-collection', parentSlug: 'yamagiwa-collection' },
              { id: 33, name: 'Jacobsson Collection', slug: 'jacobsson-collection', parentSlug: 'yamagiwa-collection' }
            ]
          }
        ];
        
        setSubCategories(lightingCategories);
      } catch (err) {
        console.error('Failed to fetch subcategories:', err);
        setError('Failed to load categories');
      }
    };

    fetchSubCategories();
  }, []);

  // 处理URL参数
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    
    // 确保在URL参数变化时正确更新状态
    if (categoryParam && categoryParam !== activeCategory) {
      setActiveCategory(categoryParam);
      // 当从URL参数设置状态时，禁用重置逻辑
      setShouldResetSubCategory(false);
      // 如果没有指定子分类参数，重置为'all'
      if (!subcategoryParam) {
        setActiveSubCategory('all');
      }
    }
    if (subcategoryParam && subcategoryParam !== activeSubCategory) {
      setActiveSubCategory(subcategoryParam);
    } else if (!subcategoryParam && activeSubCategory !== 'all') {
      // 如果URL中没有子分类参数，重置为'all'
      setActiveSubCategory('all');
    }
  }, [searchParams, activeCategory, activeSubCategory]);

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
      setLoading(true);
      setError(null); // 重置错误状态
      const requestId = ++requestIdRef.current;
      
      try {
        // 根据当前活动分类和子分类构建查询
        let query = '';
        
        // 处理'All'选项的查询逻辑
        if (activeSubCategory === 'all') {
          // 根据主分类显示所有相关产品
          if (activeCategory === 'category') {
            query = `filters[category][slug][$in][0]=wall-lights&filters[category][slug][$in][1]=table-lamps&filters[category][slug][$in][2]=floor-lamps&filters[category][slug][$in][3]=pendant&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'fortuny-collection') {
            // 对于FORTUNY COLLECTION，查询所有fortuny相关产品
            query = `filters[category][slug][$in][0]=silk-lamps&filters[category][slug][$in][1]=glass-lamps&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'yamagiwa-collection') {
            // 对于YAMAGIWA COLLECTION，查询所有yamagiwa相关产品
            query = `filters[category][slug][$in][0]=frank-lloyd-wright-collection&filters[category][slug][$in][1]=jacobsson-collection&populate[0]=main_image&populate[1]=hover_image`;
          }
        } else if (activeSubCategory && activeSubCategory !== 'all') {
          // 对于其他分类，使用完整的子分类slug查询
          query = `filters[category][slug][$eq]=${activeSubCategory}&populate[0]=main_image&populate[1]=hover_image`;
        } else if (activeCategory) {
          // 如果只选择了主分类，显示该分类下的所有产品
          if (activeCategory === 'category') {
            query = `filters[category][slug][$in][0]=wall-lights&filters[category][slug][$in][1]=table-lamps&filters[category][slug][$in][2]=floor-lamps&filters[category][slug][$in][3]=pendant&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'fortuny-collection') {
            query = `filters[category][slug][$in][0]=silk-lamps&filters[category][slug][$in][1]=glass-lamps&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'yamagiwa-collection') {
            query = `filters[category][slug][$in][0]=frank-lloyd-wright-collection&filters[category][slug][$in][1]=jacobsson-collection&populate[0]=main_image&populate[1]=hover_image`;
          } else {
            // 对于其他主分类，暂时显示空结果
            if (requestId === requestIdRef.current) {
              setProducts([]);
              setLoading(false);
            }
            return;
          }
        }
        
        if (!query) {
          if (requestId === requestIdRef.current) {
            setProducts([]);
            setLoading(false);
          }
          return;
        }
        
        console.log('Lighting page query:', query);
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
          if (requestId === requestIdRef.current) {
            setProducts([]);
          }
          return;
        }

        const data = await response.json();
        
        // 检查数据结构是否正确
        if (!data || !Array.isArray(data.data)) {
          console.warn('Invalid data structure received from API');
          if (requestId === requestIdRef.current) {
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

        if (requestId === requestIdRef.current) {
          setProducts(transformedProducts);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
        // 不设置错误状态，而是显示空产品列表
        if (requestId === requestIdRef.current) {
          setProducts([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
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
    router.replace(`/lighting?category=${categorySlug}`);
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
      router.replace(`/lighting?category=${parentCategorySlug}&subcategory=${subCategorySlug}`);
    } else if (parentCategorySlug) {
      router.replace(`/lighting?category=${parentCategorySlug}`);
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
    if (!currentCategory) return 'LIGHTING';
    
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
      if (currentSubItem) {
        // 去掉"COLLECTION"这个词，让显示更简洁
        const categoryDisplayName = category.name.replace(' COLLECTION', '');
        return `${categoryDisplayName}-${currentSubItem.name}`;
      }
      return category.name;
    }
    return category.name;
  };

  return (
    <main className={styles.container}>
      {/* 页面标题 */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>LIGHTING</h1>
        <p className={styles.pageDescription}>
          Discover our exquisite collection of designer lighting, featuring renowned brands 
          and timeless pieces that illuminate your space with elegance and style.
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
              onTouchStart={() => handleTouchStart(category.slug)}
            >
              <button
                className={`${styles.categoryTab} ${
                  activeCategory === category.slug ? styles.active : ''
                }`}
                onClick={() => handleCategoryChange(category.slug)}
              >
                {getCategoryButtonText(category)}
              </button>
              
              {/* 下拉菜单指示器 */}
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

export default function LightingPage() {
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
      <LightingContent />
    </Suspense>
  );
}