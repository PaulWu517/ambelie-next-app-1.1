'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../app/products/[slug]/ProductDetailPage.module.css';

interface ImageItem {
  url: string;
  alternativeText?: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Product {
  id: number;
  name: string;
  period: string;
  slug: string;
  category?: Category;
  main_image?: ImageItem | null;
  hover_image?: ImageItem | null;
}

interface RelatedProductsProps {
  currentProduct: Product;
}

export default function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!currentProduct.category?.slug) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // 获取同分类的其他产品，排除当前产品
        const query = `filters[category][slug][$eq]=${currentProduct.category.slug}&filters[id][$ne]=${currentProduct.id}&populate[0]=main_image&populate[1]=hover_image&pagination[limit]=4`;
        
        const response = await fetch(`${API_URL}/api/products?${query}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch related products: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !Array.isArray(data.data)) {
          throw new Error('Invalid data structure received from API');
        }
        
        // 转换产品数据
        const transformedProducts: Product[] = data.data.map((product: any) => ({
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
        }));
        
        setRelatedProducts(transformedProducts);
      } catch (err) {
        console.error('Error fetching related products:', err);
        setError(err instanceof Error ? err.message : 'Failed to load related products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRelatedProducts();
  }, [currentProduct.id, currentProduct.category?.slug, API_URL]);
  
  if (loading) {
    return (
      <section className={styles.relatedProducts}>
        <h2 className={styles.relatedTitle}>ITEMS SIMILAR</h2>
        <div className={styles.loading}>Loading related products...</div>
      </section>
    );
  }
  
  if (error || relatedProducts.length === 0) {
    return (
      <section className={styles.relatedProducts}>
        <h2 className={styles.relatedTitle}>ITEMS SIMILAR</h2>
        <div className={styles.noProducts}>No similar items found.</div>
      </section>
    );
  }

  return (
    <section className={styles.relatedProducts}>
      <h2 className={styles.relatedTitle}>ITEMS SIMILAR</h2>
      <div className={styles.relatedItems}>
        {relatedProducts.map((product) => (
          <div key={product.slug} className={styles.relatedItem}>
            <Link href={`/products/${product.slug}`} className={styles.relatedLink}>
              <div className={styles.relatedImage}>
                <Image
                  src={product.main_image?.url || '/assets/images/placeholder.jpg'}
                  alt={product.main_image?.alternativeText || product.name}
                  width={400}
                  height={533}
                  className={styles.relatedImg}
                />
              </div>
              <div className={styles.relatedInfo}>
                <h3 className={styles.relatedProductTitle}>{product.name}</h3>
                <p className={styles.relatedPeriod}>{product.period}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}