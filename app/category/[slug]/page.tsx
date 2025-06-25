import React from 'react';
import { notFound } from 'next/navigation';
import styles from './CategoryPage.module.css';
import ProductCard from '@/components/ProductCard';

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

interface CategoryData {
  name: string;
  description: string | null;
  products: Product[];
}

// --- DATA FETCHING ---
async function getCategoryData(slug: string): Promise<CategoryData | null> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  
  try {
    // Step 1: Get the category basic info (name, description)
    const categoryRes = await fetch(`${API_URL}/api/categories?filters[slug][$eq]=${slug}`, { 
      cache: 'no-store' 
    });

    if (!categoryRes.ok) {
      console.error(`Failed to fetch category info for slug '${slug}':`, await categoryRes.text());
      return null;
    }

    const categoryJson = await categoryRes.json();
    
    if (!categoryJson.data || categoryJson.data.length === 0) {
      console.warn(`No category found for slug: ${slug}`);
      return null;
    }
    
    // 根据Strapi v4文档，数据结构可能是直接在根级别的，也可能在attributes中
    const categoryItem = categoryJson.data[0];
    const categoryData = categoryItem.attributes ? categoryItem.attributes : categoryItem;

    // Step 2: Get all products that belong to this category.
    // We filter products where the 'category' relation has a matching slug.
    // Note: Assuming the relation field on the Product content type is 'category' (singular).
    const productQuery = `filters[category][slug][$eq]=${slug}&populate[0]=main_image&populate[1]=hover_image`;
    const productsRes = await fetch(`${API_URL}/api/products?${productQuery}`, {
      cache: 'no-store'
    });

    if (!productsRes.ok) {
      console.error(`Failed to fetch products for category '${slug}':`, await productsRes.text());
      return null;
    }

    const productsJson = await productsRes.json();

    // Transform products data to match the Product interface
    // 注意：根据首页的成功实现，产品数据是直接在根级别的，不是在attributes中
    const products: Product[] = productsJson.data.map((product: any) => ({
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

    return {
      name: categoryData.name,
      description: categoryData.description,
      products: products,
    };
  } catch (error) {
    console.error(`An unexpected error occurred in getCategoryData for slug '${slug}':`, error);
    return null;
  }
}


// --- PAGE COMPONENT ---
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  // Next.js 15 要求 await params
  const { slug } = await params;
  const categoryData = await getCategoryData(slug);

  if (!categoryData) {
    notFound();
  }

  return (
    <main className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{categoryData.name}</h1>
        {categoryData.description && (
          <p className={styles.pageDescription}>
            {categoryData.description}
          </p>
        )}
      </header>
      
      <div className={styles.productGrid}>
        {categoryData.products.length > 0 ? (
          categoryData.products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <p>There are no products in this category.</p>
        )}
      </div>
    </main>
  );
} 