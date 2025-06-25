import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductCard.module.css';

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

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // This component assumes image URLs are either absolute or correctly prefixed.
  // For placeholder data, we expect something like '/assets/images/...'
  // For Strapi data, the parent component should construct the full URL.
  const mainImageSrc = product.main_image?.url || '';
  const hoverImageSrc = product.hover_image?.url || '';

  return (
    <article className={styles.productItem}>
      <Link href={`/products/${product.slug}`} className={styles.productLink}>
        <div className={styles.productImage}>
          {mainImageSrc && (
            <Image
              src={mainImageSrc}
              alt={product.main_image?.alternativeText || product.name}
              width={500}
              height={667}
              style={{ aspectRatio: '3/4', objectFit: 'cover' }}
            />
          )}
          {hoverImageSrc && (
            <Image
              src={hoverImageSrc}
              alt={product.hover_image?.alternativeText || `${product.name} - Detail`}
              className={styles.hoverImage}
              width={500}
              height={667}
              style={{ aspectRatio: '3/4', objectFit: 'cover' }}
            />
          )}
        </div>
        <div className={styles.productInfo}>
          <h2 className={styles.productTitle}>{product.name}</h2>
          <p className={styles.productPeriod}>{product.period}</p>
        </div>
      </Link>
    </article>
  );
};

export default ProductCard; 