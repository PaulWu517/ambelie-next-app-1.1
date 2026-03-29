'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import styles from './OrientalFurniture.module.css';

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
}

// --- COMPONENT ---
function OrientalFurnitureContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (typeof window === 'undefined') return 'screens';
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'screens';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const requestIdRef = useRef(0);

  const searchParams = useSearchParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  // 别名映射：兼容旧的 chairs 到新的 seating
  const slugAliasMap: Record<string, string> = { 'chairs': 'seating' };
  const canonicalActiveCategory = slugAliasMap[activeCategory] || activeCategory;

  // 处理URL参数变化
  useEffect(() => {
    const category = searchParams.get('category');
    if (category && category !== activeCategory) {
      setActiveCategory(category);
      setCurrentPage(1); // 切换分类时重置页码
    } else if (!category && activeCategory !== 'screens') {
      // 如果没有URL参数，设置默认分类
      setActiveCategory('screens');
      setCurrentPage(1);
    }
  }, [searchParams, activeCategory]);

  // 获取东方家具相关的子分类
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        // 获取东方家具相关的子分类，slug需要与页眉链接对应
        const orientalCategories = [
          { id: 1, name: 'SCREENS', slug: 'screens', description: 'Traditional oriental screens' },
          { id: 2, name: 'SEATING', slug: 'seating', description: 'Oriental style seating' },
          { id: 3, name: 'TABLES', slug: 'tables', description: 'Oriental dining and tea tables' },
          { id: 4, name: 'CABINETS & CUPBOARDS', slug: 'cabinets-and-cupboards', description: 'Traditional oriental cabinets and cupboards' },
          { id: 5, name: 'RUGS', slug: 'rugs', description: 'Oriental rugs and carpets' },
          { id: 6, name: 'OTHERS', slug: 'others', description: 'Other oriental furniture pieces' }
        ];
        
        setSubCategories(orientalCategories);
      } catch (err) {
        console.error('Failed to fetch subcategories:', err);
        setError('Failed to load categories');
      }
    };

    fetchSubCategories();
  }, []);

  // 获取产品数据
  useEffect(() => {
    // 只有在activeCategory有值时才获取产品
    if (!activeCategory) return;
    
    const fetchProducts = async () => {
      setLoading(true);
      const requestId = ++requestIdRef.current;
      try {
        // 获取特定子分类的产品，参考category页面的实现（同时兼容oriental-前缀与chairs别名）
        const candidateSlugs: string[] = [];
        if (activeCategory && activeCategory !== canonicalActiveCategory) {
          candidateSlugs.push(activeCategory);
        }
        candidateSlugs.push(canonicalActiveCategory);
        if (!canonicalActiveCategory.startsWith('oriental-')) {
          candidateSlugs.push(`oriental-${canonicalActiveCategory}`);
        }
        const inQuery = candidateSlugs
          .map((slug, idx) => `filters[category][slug][$in][${idx}]=${slug}`)
          .join('&');
        // 添加分页参数：每页24个（Strapi默认是25，这里显式指定并传入当前页码）
        const pageSize = 24;
        const query = `${inQuery}&populate[0]=main_image&populate[1]=hover_image&sort[0]=updatedAt:desc&pagination[page]=${currentPage}&pagination[pageSize]=${pageSize}`;
        
        const response = await fetch(`${API_URL}/api/products?${query}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (requestId === requestIdRef.current) {
            setError('Failed to load products');
            setProducts([]);
          }
          return;
        }

        const data = await response.json();
        
        // 转换产品数据，参考category页面的实现
        const transformedProducts: Product[] = data.data.map((product: any) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          period: product.period,
          main_image: product.main_image ? {
            url: product.main_image.url.startsWith('http') ? product.main_image.url : `${API_URL}${product.main_image.url}`,
            alternativeText: product.main_image.alternativeText,
          } : null,
          hover_image: product.hover_image ? {
            url: product.hover_image.url.startsWith('http') ? product.hover_image.url : `${API_URL}${product.hover_image.url}`,
            alternativeText: product.hover_image.alternativeText,
          } : null,
        }));

        if (requestId === requestIdRef.current) {
          setProducts(transformedProducts);
          // 从meta数据中获取总页数
          if (data.meta && data.meta.pagination) {
            setTotalPages(data.meta.pagination.pageCount || 1);
          } else {
            setTotalPages(1);
          }
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
        if (requestId === requestIdRef.current) {
          setError('Failed to load products');
          setProducts([]);
          setTotalPages(1);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
  }, [activeCategory, API_URL, currentPage]);

  const handleCategoryChange = (categorySlug: string) => {
    setActiveCategory(categorySlug);
    setCurrentPage(1); // 点击分类时重置到第一页
    // 更新URL参数
    router.replace(`/oriental-furniture?category=${categorySlug}`);
  };

  // 分页处理函数
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // 平滑滚动到顶部，优化用户体验
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (error) {
    return (
      <main className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* 页面标题 */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>ORIENTAL FURNITURE</h1>
        <p className={styles.pageDescription}>
          Discover our exquisite collection of traditional and contemporary oriental furniture pieces, 
          crafted with timeless elegance and superior craftsmanship.
        </p>
      </header>

      {/* 子分类导航 */}
      <nav className={styles.categoryNav}>
        <div className={styles.categoryTabs}>
          {subCategories.map((category) => (
            <button
              key={category.id}
              className={`${styles.categoryTab} ${
                canonicalActiveCategory === category.slug ? styles.active : ''
              }`}
              onClick={() => handleCategoryChange(category.slug)}
            >
              {category.name}
            </button>
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
                <p>No products found in this category.</p>
                <Link href="/products" className={styles.browseLink}>
                  Browse All Products
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 分页控制 */}
        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              className={styles.pageButton} 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              ← Prev
            </button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`${styles.pageNumber} ${currentPage === page ? styles.activePage : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button 
              className={styles.pageButton} 
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {/* 返回链接 */}
      <div className={styles.backLink}>
        <Link href="/" className={styles.backButton}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}

export default function OrientalFurniturePage() {
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
      <OrientalFurnitureContent />
    </Suspense>
  );
}