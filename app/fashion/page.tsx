'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import styles from './Fashion.module.css';

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
export default function FashionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('category');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldResetSubCategory, setShouldResetSubCategory] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  // 设置时装分类数据（根据导航栏分类文档）
  useEffect(() => {
    const fashionCategories: SubCategory[] = [
      {
        id: 1,
        name: 'CATEGORY',
        slug: 'category',
        description: '按品类购物',
        subItems: [
          { id: 0, name: 'All', slug: 'all', parentSlug: 'category' },
          { id: 1, name: 'Tops', slug: 'tops', parentSlug: 'category' },
          { id: 2, name: 'Jackets', slug: 'jackets', parentSlug: 'category' },
          { id: 3, name: 'Dresses', slug: 'dresses', parentSlug: 'category' }
        ]
      },
      {
        id: 2,
        name: 'RUNWAY ARCHIVE',
        slug: 'runway-archive',
        description: '秀场系列',
        subItems: [
          { id: 10, name: 'All', slug: 'all', parentSlug: 'runway-archive' },
          { id: 4, name: 'Tops', slug: 'runway-tops', parentSlug: 'runway-archive' },
          { id: 5, name: 'Jackets', slug: 'runway-jackets', parentSlug: 'runway-archive' },
          { id: 6, name: 'Dresses', slug: 'runway-dresses', parentSlug: 'runway-archive' }
        ]
      },
      {
        id: 3,
        name: 'CURATED COLLECTION',
        slug: 'curated-collection',
        description: '精选系列',
        subItems: [
          { id: 20, name: 'All', slug: 'all', parentSlug: 'curated-collection' },
          { id: 7, name: 'Tops', slug: 'curated-tops', parentSlug: 'curated-collection' },
          { id: 8, name: 'Jackets', slug: 'curated-jackets', parentSlug: 'curated-collection' },
          { id: 9, name: 'Dresses', slug: 'curated-dresses', parentSlug: 'curated-collection' }
        ]
      },
      {
        id: 4,
        name: 'BRAND PARTNERS',
        slug: 'brand-partners',
        description: '品牌合作',
        subItems: [
          { id: 30, name: 'All', slug: 'all', parentSlug: 'brand-partners' },
          { id: 10, name: 'FORTUNY', slug: 'fortuny', parentSlug: 'brand-partners' },
          { id: 11, name: 'T.BA', slug: 't-ba', parentSlug: 'brand-partners' },
          { id: 12, name: 'DANIEL HANSON', slug: 'daniel-hanson', parentSlug: 'brand-partners' },
          { id: 13, name: 'ARCHIVIO J.M.RIBOT', slug: 'archivio-jm-ribot', parentSlug: 'brand-partners' }
        ]
      }
    ];
    
    setSubCategories(fashionCategories);
    
    // 设置默认活动分类
    if (!activeCategory && fashionCategories.length > 0) {
      setActiveCategory(fashionCategories[0].slug);
    }
  }, []);

  // 处理URL参数
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    
    // 确保在URL参数变化时正确更新状态
    if (categoryParam && categoryParam !== activeCategory) {
      setActiveCategory(categoryParam);
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
      
      try {
        // 根据当前活动分类和子分类构建查询
        let query = '';
        
        // 处理'All'选项的查询逻辑
        if (activeSubCategory === 'all') {
          // 根据主分类显示所有相关产品
          if (activeCategory === 'category') {
            query = `filters[category][slug][$in][0]=tops&filters[category][slug][$in][1]=jackets&filters[category][slug][$in][2]=dresses&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'runway-archive') {
            // 对于RUNWAY ARCHIVE，查询所有runway相关产品
            query = `filters[category][slug][$in][0]=runway-tops&filters[category][slug][$in][1]=runway-jackets&filters[category][slug][$in][2]=runway-dresses&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'curated-collection') {
            // 对于CURATED COLLECTION，查询所有curated相关产品
            query = `filters[category][slug][$in][0]=curated-tops&filters[category][slug][$in][1]=curated-jackets&filters[category][slug][$in][2]=curated-dresses&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'brand-partners') {
            // 对于BRAND PARTNERS，查询所有品牌产品
            query = `filters[brand][$in][0]=FORTUNY&filters[brand][$in][1]=T.BA&filters[brand][$in][2]=DANIEL HANSON&filters[brand][$in][3]=ARCHIVIO J.M.RIBOT&populate[0]=main_image&populate[1]=hover_image`;
          }
        } else if (activeCategory === 'brand-partners' && activeSubCategory && activeSubCategory !== 'all') {
          // 对于BRAND PARTNERS分类，使用品牌名称查询
          const brandMap: { [key: string]: string } = {
            'fortuny': 'FORTUNY',
            't-ba': 'T.BA',
            'daniel-hanson': 'DANIEL HANSON',
            'archivio-jm-ribot': 'ARCHIVIO J.M.RIBOT'
          };
          const brandName = brandMap[activeSubCategory];
          if (brandName) {
            query = `filters[brand][$eq]=${brandName}&populate[0]=main_image&populate[1]=hover_image`;
          }
        } else if (activeSubCategory && activeSubCategory !== 'all') {
          // 对于其他分类，使用完整的子分类slug查询
          query = `filters[category][slug][$eq]=${activeSubCategory}&populate[0]=main_image&populate[1]=hover_image`;
        } else if (activeCategory) {
          // 如果只选择了主分类，显示该分类下的所有产品
          if (activeCategory === 'category') {
            query = `filters[category][slug][$in][0]=tops&filters[category][slug][$in][1]=jackets&filters[category][slug][$in][2]=dresses&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'runway-archive') {
            query = `filters[category][slug][$in][0]=runway-tops&filters[category][slug][$in][1]=runway-jackets&filters[category][slug][$in][2]=runway-dresses&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'curated-collection') {
            query = `filters[category][slug][$in][0]=curated-tops&filters[category][slug][$in][1]=curated-jackets&filters[category][slug][$in][2]=curated-dresses&populate[0]=main_image&populate[1]=hover_image`;
          } else {
            // 对于其他主分类，暂时显示空结果
            setProducts([]);
            setLoading(false);
            return;
          }
        }
        
        if (!query) {
          setProducts([]);
          setLoading(false);
          return;
        }
        
        console.log('Fashion page query:', query);
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
          setProducts([]);
          return;
        }

        const data = await response.json();
        
        // 检查数据结构是否正确
        if (!data || !Array.isArray(data.data)) {
          console.warn('Invalid data structure received from API');
          setProducts([]);
          return;
        }
        
        // 转换产品数据，参考category页面的实现
        const transformedProducts: Product[] = data.data.map((product: any) => {
          try {
            return {
              id: product.id || 0,
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

        setProducts(transformedProducts);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        // 不设置错误状态，而是显示空产品列表
        setProducts([]);
      } finally {
        setLoading(false);
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
    
    // 只更新URL参数，不进行页面跳转
    const params = new URLSearchParams();
    params.set('category', categorySlug);
    router.replace(`/fashion?${params.toString()}`);
  };

  const handleSubCategoryChange = (subCategorySlug: string, parentCategorySlug?: string) => {
    // 如果提供了父分类，先设置父分类
    if (parentCategorySlug && parentCategorySlug !== activeCategory) {
      setActiveCategory(parentCategorySlug);
    }
    setActiveSubCategory(subCategorySlug);
    setOpenDropdown(null); // 关闭下拉菜单
    
    // 不进行路由跳转，只更新URL参数以保持状态同步
    const params = new URLSearchParams();
    if (parentCategorySlug) {
      params.set('category', parentCategorySlug);
    }
    if (subCategorySlug !== 'all') {
      params.set('subcategory', subCategorySlug);
    }
    
    // 使用 replace 而不是 push，避免页面重新加载
    const newUrl = params.toString() ? `/fashion?${params.toString()}` : '/fashion';
    router.replace(newUrl);
  };

  const handleMouseEnter = (categorySlug: string) => {
    setOpenDropdown(categorySlug);
  };

  const handleMouseLeave = () => {
    setOpenDropdown(null);
  };

  // 获取当前显示的导航标题
  const getCurrentNavTitle = () => {
    const currentCategory = subCategories.find(cat => cat.slug === activeCategory);
    if (!currentCategory) return 'FASHION';
    
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
        <h1 className={styles.pageTitle}>FASHION</h1>
        <p className={styles.pageDescription}>
          Discover our curated collection of luxury fashion, featuring runway pieces, 
          designer collaborations, and timeless garments that define contemporary elegance.
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
              <span className={`${styles.dropdownIndicator} ${
                activeCategory === category.slug ? styles.active : ''
              }`}>
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