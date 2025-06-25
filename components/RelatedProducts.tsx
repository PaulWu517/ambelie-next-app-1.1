import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../app/products/[slug]/ProductDetailPage.module.css';

interface RelatedProduct {
  slug: string;
  title: string;
  period: string;
  imageUrl: string;
}

const mockRelatedProducts: RelatedProduct[] = [
    {
      slug: 'four-panel-japanese-byobu-screen',
      title: 'Four-Panel Japanese Byobu Screen',
      period: 'Meiji Period, 1880s',
      imageUrl: '/assets/images/3-1.jpg',
    },
    {
      slug: 'two-panel-gold-leaf-byobu-screen',
      title: 'Two-Panel Gold Leaf Byobu Screen',
      period: 'Meiji Period, Early 20th Century',
      imageUrl: '/assets/images/2-1.jpg',
    },
    {
      slug: 'six-panel-coromandel-lacquer-screen',
      title: 'Six-Panel Coromandel Lacquer Screen',
      period: 'Qing Dynasty, Late 19th Century',
      imageUrl: '/assets/images/1-1.jpg',
    },
    {
      slug: 'four-panel-suzhow-embroidery-screen',
      title: 'Four-Panel Suzhou Embroidery Screen',
      period: 'Chinese, Mid-20th Century',
      imageUrl: '/assets/images/4-1.jpg',
    },
];

export default function RelatedProducts() {
  return (
    <section className={styles.relatedProducts}>
      <h2 className={styles.relatedTitle}>ITEMS SIMILAR</h2>
      <div className={styles.relatedItems}>
        {mockRelatedProducts.map((relatedItem) => (
          <div key={relatedItem.slug} className={styles.relatedItem}>
            <Link href={`/products/${relatedItem.slug}`} className={styles.relatedLink}>
              <div className={styles.relatedImage}>
                <Image
                  src={relatedItem.imageUrl}
                  alt={relatedItem.title}
                  width={300}
                  height={400}
                  style={{objectFit: 'cover'}}
                  className={styles.relatedImg}
                />
              </div>
              <div className={styles.relatedInfo}>
                <h3 className={styles.relatedProductTitle}>{relatedItem.title}</h3>
                <p className={styles.relatedPeriod}>{relatedItem.period}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
} 