'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingCart, FileText } from 'lucide-react';
import { useCollectionStore } from '@/lib/stores/collectionStore';
import { useCartStore } from '@/lib/stores/cartStore';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import styles from './Collection.module.css';

// 成功提示组件
function SuccessToast({ 
  isVisible, 
  message, 
  onClose 
}: { 
  isVisible: boolean; 
  message: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={styles.successToast}>
      <div className={styles.toastContent}>
        <span className={styles.toastIcon}>✓</span>
        <span className={styles.toastMessage}>{message}</span>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const { items, removeFromCollection, clearCollection, loadFromBackend } = useCollectionStore();
  const { addToCart } = useCartStore();
  const { addToInquiry } = useInquiryStore();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 组件加载时总是从后端重新加载收藏列表，不依赖缓存
  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  const handleAddToCart = (item: any) => {
    addToCart(item);
    setToastMessage(`${item.name} added to cart`);
    setShowToast(true);
    // Optionally remove from collection after adding to cart
    // removeFromCollection(item.id);
  };

  const handleAddToInquiry = (item: any) => {
    addToInquiry(item);
    setToastMessage(`${item.name} added to inquiry`);
    setShowToast(true);
    // Optionally remove from collection after adding to inquiry
    // removeFromCollection(item.id);
  };

  const handleCloseToast = () => {
    setShowToast(false);
  };

  if (items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Collections</h1>
          <p className={styles.subtitle}>Curated pieces that caught your eye</p>
        </div>
        
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>♡</div>
          <h2>Your collection is empty</h2>
          <p>Start building your curated collection by adding pieces you love.</p>
          <Link href="/" className={styles.continueShoppingBtn}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Collection</h1>
        <p className={styles.subtitle}>{items.length} curated piece{items.length !== 1 ? 's' : ''}</p>
        <button 
          onClick={clearCollection}
          className={styles.clearAllBtn}
        >
          Clear All
        </button>
      </div>

      <div className={styles.collectionGrid}>
        {items.map((item) => (
          <div key={item.id} className={styles.collectionItem}>
            <div className={styles.imageContainer}>
              <Link href={`/products/${item.slug}`}>
                {item.main_image?.data?.attributes?.url ? (
                  <Image
                    src={item.main_image.data.attributes.url.startsWith('http') 
                      ? item.main_image.data.attributes.url 
                      : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app'}${item.main_image.data.attributes.url}`}
                    alt={item.name}
                    width={300}
                    height={400}
                    className={styles.productImage}
                    unoptimized
                  />
                ) : (
                  <div className={styles.noImage}>
                    <span>No Image</span>
                  </div>
                )}
              </Link>
              <button
                onClick={() => removeFromCollection(item.slug)}
                className={styles.removeBtn}
                aria-label="Remove from collection"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className={styles.itemInfo}>
              <Link href={`/products/${item.slug}`} className={styles.itemName}>
                {item.name}
              </Link>
              <p className={styles.itemPeriod}>{item.period}</p>
              <p className={styles.itemPrice}>
                {item.price && item.price > 0 ? `$${item.price.toLocaleString()}` : 'Price on inquiry'}
              </p>
              
              <div className={styles.itemActions}>
                {item.price && item.price > 0 ? (
                  <button
                    onClick={() => handleAddToCart(item)}
                    className={styles.addToCartBtn}
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddToInquiry(item)}
                    className={styles.addToInquiryBtn}
                  >
                    <FileText size={16} />
                    Add to Inquiry
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <SuccessToast 
        isVisible={showToast}
        message={toastMessage}
        onClose={handleCloseToast}
      />
    </div>
  );
}