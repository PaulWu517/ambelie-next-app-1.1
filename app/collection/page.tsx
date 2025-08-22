'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingCart, FileText } from 'lucide-react';
import { useCollectionStore } from '@/lib/stores/collectionStore';
import { useCartStore } from '@/lib/stores/cartStore';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import styles from './Collection.module.css';

// 在本文件内统一定义后端基础 URL，避免硬编码和未定义错误
const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

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
        {items.map((item) => {
          // 详细调试：输出item的完整数据结构
          console.log('🔍 [Collection Debug] Item data:', JSON.stringify(item, null, 2));
          console.log('🖼️ [Collection Debug] Main image data:', JSON.stringify(item.main_image, null, 2));
          
          // 构建图片URL - 适配两种数据结构
          let imageUrl = '/placeholder.jpg';
          
          if (item.main_image) {
            // 检查是否是新的数据结构 (直接的图片对象)
            if ((item.main_image as any).url) {
              const url = (item.main_image as any).url;
              imageUrl = url.startsWith('http') ? 
                url : 
                `${API_URL}${url}`;
            }
            // 检查是否是旧的数据结构 (包含data.attributes)
            else if (item.main_image.data?.attributes?.url) {
              imageUrl = item.main_image.data.attributes.url.startsWith('http') ? 
                item.main_image.data.attributes.url : 
                `${API_URL}${item.main_image.data.attributes.url}`;
            }
          }
          
          console.log('🌐 [Collection Debug] Final image URL for', item.name, ':', imageUrl);
          console.log('📊 [Collection Debug] URL analysis:', {
            hasMainImage: !!item.main_image,
            hasDirectUrl: !!(item.main_image as any)?.url,
            hasData: !!item.main_image?.data,
            hasAttributes: !!item.main_image?.data?.attributes,
            hasNestedUrl: !!item.main_image?.data?.attributes?.url,
            directUrl: (item.main_image as any)?.url,
            nestedUrl: item.main_image?.data?.attributes?.url,
            finalUrl: imageUrl
          });
          
          return (
          <div key={item.id} className={styles.collectionItem}>
            <div className={styles.imageContainer}>
              <Link href={`/products/${item.slug}`}>
                <Image
                  src={imageUrl}
                  alt={item.name}
                  width={300}
                  height={400}
                  className={styles.productImage}
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error('❌ [Collection Debug] Image load failed for:', item.name, 'URL:', imageUrl);
                    target.src = '/placeholder.jpg';
                  }}
                  onLoad={() => {
                    console.log('✅ [Collection Debug] Image loaded successfully for:', item.name, 'URL:', imageUrl);
                  }}
                />
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
          );
        })}
      </div>
      
      <SuccessToast 
        isVisible={showToast}
        message={toastMessage}
        onClose={handleCloseToast}
      />
    </div>
  );
}