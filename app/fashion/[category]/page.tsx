'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import styles from '../Fashion.module.css';

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

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  // 获取时装相关的子分类
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        const fashionCategories = [
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
        
        // 根据URL参数设置活动分类
        const categorySlug = category.toLowerCase();
        setActiveCategory(categorySlug);
        setActiveSubCategory('all'); // 单级分类默认显示所有子项
      } catch (err) {
        console.error('Failed to fetch subcategories:', err);
        setError('Failed to load categories');
      }
    };

    fetchSubCategories();
  }, [category]);

  // 获取产品数据
  useEffect(() => {
    const fetchProducts = async () => {
      if (!activeCategory) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const query = `filters[category][slug][$eq]=${activeCategory}&populate[0]=main_image&populate[1]=hover_image`;
        
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
        }).filter(Boolean) as Product[];

        setProducts(transformedProducts);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [activeCategory, API_URL]);

  const handleCategoryChange = (categorySlug: string) => {
    setActiveCategory(categorySlug);
    setActiveSubCategory('all');
    setOpenDropdown(null);
    
    const categoryPath = categorySlug.replace(/_/g, '-');
    router.push(`/fashion/${categoryPath}`);
  };

  const handleSubCategoryChange = (subCategorySlug: string, parentCategorySlug?: string) => {
    if (parentCategorySlug && parentCategorySlug !== activeCategory) {
      setActiveCategory(parentCategorySlug);
    }
    setActiveSubCategory(subCategorySlug);
    setOpenDropdown(null);
    
    if (subCategorySlug !== 'all' && parentCategorySlug) {
      const categoryPath = parentCategorySlug.replace(/_/g, '-');
      const subcategoryPath = subCategorySlug.replace(/_/g, '-');
      router.push(`/fashion/${categoryPath}/${subcategoryPath}`);
    } else if (parentCategorySlug) {
      const categoryPath = parentCategorySlug.replace(/_/g, '-');
      router.push(`/fashion/${categoryPath}`);
    }
  };

  const handleMouseEnter = (categorySlug: string) => {
    setOpenDropdown(categorySlug);
  };

  const handleMouseLeave = () => {
    setOpenDropdown(null);
  };

  // 获取分类按钮显示的文字
  const getCategoryButtonText = (category: SubCategory) => {
    if (activeCategory === category.slug && activeSubCategory && activeSubCategory !== 'all') {
      const currentSubItem = category.subItems?.find(item => item.slug === activeSubCategory);
      if (currentSubItem) {
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
          Discover our exquisite collection of designer fashion, featuring renowned brands 
          and timeless pieces that elevate your style with elegance and sophistication.
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