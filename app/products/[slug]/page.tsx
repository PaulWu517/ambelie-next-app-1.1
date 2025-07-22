import React from 'react';
import styles from './ProductDetailPage.module.css';
import ProductDisplay from '../../../components/ProductDisplay';
import RelatedProducts from '../../../components/RelatedProducts';

// Define the types needed for data fetching
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
  description: string;
  materials: string;
  origin: string;
  dimensions: string;
  designer: string;
  price?: number;
  isInquiryOnly?: boolean;
  images?: ImageItem[] | null;
  slug: string;
  category?: Category;
}

interface StrapiResponse {
  data: Product[];
}

// Function to fetch a single product by its slug
async function getProductBySlug(slug: string): Promise<Product | null> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  try {
    console.log(`Fetching product with slug: ${slug}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_URL}/api/products?filters[slug][$eq]=${slug}&populate[0]=images&populate[1]=category`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.error(`API Error: ${res.status} ${res.statusText}`);
      throw new Error(`Failed to fetch product: ${res.status}`);
    }
    
    const json: StrapiResponse = await res.json();
    console.log(`Found ${json.data.length} products for slug: ${slug}`);
    
    if (json.data.length === 0) {
      return null;
    }
    return json.data[0];
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Request timeout for slug:', slug);
      } else {
        console.error('Error fetching product by slug:', slug, error.message);
      }
    } else {
      console.error('Unknown error fetching product:', error);
    }
    return null;
  }
}

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  if (!product) {
    return (
      <main className={`product-detail-page ${styles.subpageContent}`}>
        <div className="text-center py-20">Product not found.</div>
      </main>
    );
  }

  return (
    <main className={`product-detail-page ${styles.subpageContent}`}>
      <ProductDisplay product={product} API_URL={API_URL} />
      <RelatedProducts currentProduct={product} />
    </main>
  );
}