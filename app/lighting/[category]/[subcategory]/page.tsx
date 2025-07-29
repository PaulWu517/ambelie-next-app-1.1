'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import styles from '../../Lighting.module.css';

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

export default function SubCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  const subcategory = params.subcategory as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  // 获取灯具相关的子分类
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
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
        
        // 根据URL参数设置活动分类
        const categorySlug = category.toLowerCase();
        const subcategorySlug = subcategory.toLowerCase();
        
        setActiveCategory(categorySlug);
        setActiveSubCategory(subcategorySlug);
      } catch (err) {
        console.error('Failed to fetch subcategories:', err);
        setError('Failed to load categories');
      }
    };

    fetchSubCategories();
  }, [category, subcategory]);

  // 获取产品数据
  useEffect(() => {
    const fetchProducts = async () => {
      if (!activeCategory || !activeSubCategory) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let query = '';
        if (activeSubCategory === 'all') {
          query = `filters[category][slug][$eq]=${activeCategory}&populate[0]=main_image&populate[1]=hover_image`;
        } else {
          query = `filters[subcategory][slug][$eq]=${activeSubCategory}&populate[0]=main_image&populate[1]=hover_image`;
        }
        
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
  }, [activeCategory, activeSubCategory, API_URL]);

  const handleCategoryChange = (categorySlug: string) => {
    setActiveCategory(categorySlug);
    setActiveSubCategory('all');
    setOpenDropdown(null);
    
    const categoryPath = categorySlug.replace(/_/g, '-');
    router.push(`/lighting/${categoryPath}`);
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
      router.push(`/lighting/${categoryPath}/${subcategoryPath}`);
    } else if (parentCategorySlug) {
      const categoryPath = parentCategorySlug.replace(/_/g, '-');
      router.push(`/lighting/${categoryPath}`);
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