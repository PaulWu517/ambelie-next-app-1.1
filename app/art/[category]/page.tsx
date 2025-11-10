'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import styles from '../Art.module.css';

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

export default function ArtCategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = params.category as string;
  const subcategory = searchParams.get('subcategory') || 'all';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(category || '');
  const [activeSubCategory, setActiveSubCategory] = useState<string>(subcategory);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  // 设置艺术品分类数据
  useEffect(() => {
    const artCategories: SubCategory[] = [
      {
        id: 1,
        name: 'CATEGORY',
        slug: 'category',
        description: '按品类购物',
        subItems: [
          { id: 0, name: 'All', slug: 'all', parentSlug: 'category' },
          { id: 1, name: 'Sculpture', slug: 'sculpture', parentSlug: 'category' },
          { id: 2, name: 'Paintings', slug: 'paintings', parentSlug: 'category' },
          { id: 3, name: 'Drawings & Watercolor', slug: 'drawings-and-watercolor', parentSlug: 'category' }
        ]
      },
      {
        id: 2,
        name: 'ORIENTAL ART',
        slug: 'oriental-art',
        description: '东方艺术',
        subItems: [
          { id: 10, name: 'All', slug: 'all', parentSlug: 'oriental-art' },
          { id: 4, name: 'Calligraphy', slug: 'calligraphy', parentSlug: 'oriental-art' },
          { id: 5, name: 'Embroidery', slug: 'embroidery', parentSlug: 'oriental-art' }
        ]
      }
    ];
    
    setSubCategories(artCategories);
    setActiveCategory(category);
  }, [category]);

  // 处理URL参数变化
  useEffect(() => {
    const subcategoryParam = searchParams.get('subcategory');
    if (subcategoryParam) {
      setActiveSubCategory(subcategoryParam);
    } else {
      setActiveSubCategory('all');
    }
  }, [searchParams]);

  // 获取产品数据
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let query = '';
        
        // 根据分类和子分类构建查询
        if (activeSubCategory === 'all') {
          if (activeCategory === 'category') {
            query = `filters[category][slug][$in][0]=sculpture&filters[category][slug][$in][1]=paintings&filters[category][slug][$in][2]=drawings-and-watercolor&populate[0]=main_image&populate[1]=hover_image`;
          } else if (activeCategory === 'oriental-art') {
            query = `filters[category][slug][$in][0]=calligraphy&filters[category][slug][$in][1]=embroidery&populate[0]=main_image&populate[1]=hover_image`;
          }
        } else {
          query = `filters[category][slug][$eq]=${activeSubCategory}&populate[0]=main_image&populate[1]=hover_image`;
        }
        
        if (!query) {
          setProducts([]);
          setLoading(false);
          return;
        }
        // 按更新时间倒序显示（后端最新修改在最前）
        query += `&sort[0]=updatedAt:desc`;

        console.log('Art category page query:', query);
        console.log('Active category:', activeCategory, 'Active subcategory:', activeSubCategory);
        
        const response = await fetch(`${API_URL}/api/products?${query}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`API request failed with status ${response.status}`);
          setProducts([]);
          return;
        }

        const data = await response.json();
        
        if (!data || !Array.isArray(data.data)) {
          console.warn('Invalid data structure received from API');
          setProducts([]);
          return;
        }

        const transformedProducts = data.data.map((item: any) => ({
          id: item.id,
          slug: item.slug,
          name: item.name,
          period: item.period || '',
          main_image: item.main_image,
          hover_image: item.hover_image,
        }));

        setProducts(transformedProducts);
        
      } catch (error) {
        console.error('Error fetching art products:', error);
        setError('Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (activeCategory) {
      fetchProducts();
    }
  }, [activeCategory, activeSubCategory, API_URL]);

  // 处理分类切换
  const handleCategoryChange = (categorySlug: string) => {
    setActiveCategory(categorySlug);
    setActiveSubCategory('all');
    setOpenDropdown(null);
    router.push(`/art/${categorySlug}?subcategory=all`);
  };

  // 处理子分类切换
  const handleSubCategoryChange = (subCategorySlug: string) => {
    setActiveSubCategory(subCategorySlug);
    setOpenDropdown(null);
    if (subCategorySlug === 'all') {
      router.push(`/art/${activeCategory}`);
    } else {
      router.push(`/art/${activeCategory}?subcategory=${subCategorySlug}`);
    }
  };

  // 获取当前活动分类的信息
  const currentCategory = subCategories.find(cat => cat.slug === activeCategory);
  const currentSubItems = currentCategory?.subItems || [];

  return (
    <div className={styles.artPage}>
      {/* 面包屑导航 */}
      <div className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/art">Art</Link>
        <span> / </span>
        <span>{currentCategory?.name || activeCategory}</span>
        {activeSubCategory !== 'all' && (
          <>
            <span> / </span>
            <span>{currentSubItems.find(item => item.slug === activeSubCategory)?.name || activeSubCategory}</span>
          </>
        )}
      </div>

      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <h1>ART</h1>
        <p>{currentCategory?.description || 'Discover our art collection'}</p>
      </div>

      {/* 分类导航 */}
      <div className={styles.categoryNavigation}>
        <div className={styles.categoryTabs}>
          {subCategories.map((category) => (
            <button
              key={category.slug}
              className={`${styles.categoryTab} ${activeCategory === category.slug ? styles.active : ''}`}
              onClick={() => handleCategoryChange(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* 筛选器 */}
      <div className={styles.filterSection}>
        <div className={styles.filterDropdowns}>
          {/* 子分类筛选 */}
          <div className={styles.filterGroup}>
            <div className={styles.dropdown}>
              <button
                className={`${styles.dropdownButton} ${openDropdown === activeCategory ? styles.open : ''}`}
                onClick={() => setOpenDropdown(openDropdown === activeCategory ? null : activeCategory)}
              >
                <span>{currentCategory?.name || 'CATEGORY'}</span>
                <span className={styles.dropdownArrow}>▼</span>
              </button>
              {openDropdown === activeCategory && (
                <div className={styles.dropdownMenu}>
                  {currentSubItems.map((subItem) => (
                    <button
                      key={subItem.slug}
                      className={`${styles.dropdownItem} ${activeSubCategory === subItem.slug ? styles.active : ''}`}
                      onClick={() => handleSubCategoryChange(subItem.slug)}
                    >
                      {subItem.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 产品网格 */}
      <div className={styles.productsSection}>
        {loading ? (
          <div className={styles.loading}>Loading products...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : products.length === 0 ? (
          <div className={styles.noProducts}>
            <p>No artworks available in this category at the moment.</p>
            <p>We're constantly updating our collection. Please check back soon or explore other categories.</p>
            <Link href="/art" className={styles.backButton}>
              ← BACK TO HOME
            </Link>
          </div>
        ) : (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}