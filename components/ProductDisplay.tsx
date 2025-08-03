'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/stores/cartStore';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import { useCollectionStore } from '@/lib/stores/collectionStore';
import { Product as CartProduct } from '@/types';
import styles from '../app/products/[slug]/ProductDetailPage.module.css';

interface ImageItem {
  url: string;
  alternativeText?: string | null;
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
}

interface ProductDisplayProps {
  product: Product;
  API_URL: string;
}

// 成功弹窗组件
function SuccessModal({ 
  isOpen, 
  onClose, 
  productName, 
  actionType = 'cart'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  productName: string;
  actionType?: 'cart' | 'inquiry' | 'collection';
}) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-modal-content">
          <div className="success-icon">✓</div>
          <h3>
            {actionType === 'inquiry' ? 'Added to Inquiry' : 
             actionType === 'collection' ? 'Added to Collection' : 
             'Added to Cart'}
          </h3>
          <p>
            {productName} has been added to your {actionType === 'inquiry' ? 'inquiry list' : 
                                                   actionType === 'collection' ? 'collection' : 
                                                   'cart'}
          </p>
          <div className="success-modal-actions">
            <button onClick={onClose} className="continue-shopping-btn">
              Continue Shopping
            </button>
            <Link href={
              actionType === 'inquiry' ? "/inquiry" : 
              actionType === 'collection' ? "/collection" : 
              "/cart"
            } className="view-cart-btn">
              {actionType === 'inquiry' ? 'View Inquiry' : 
               actionType === 'collection' ? 'View Collection' : 
               'View Cart'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDisplay({ product, API_URL }: ProductDisplayProps) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isIntroExpanded, setIsIntroExpanded] = useState(false);
  const [lastAction, setLastAction] = useState<'cart' | 'inquiry' | 'collection'>('cart');
  
  const { addToCart } = useCartStore();
  const { addToInquiry } = useInquiryStore();
  const { addToCollection } = useCollectionStore();
  
  const actualPrice = product.price || 0;
  const isInquiryOnly = product.isInquiryOnly || false;

  const images = product.images?.map(img => ({
    src: `${API_URL}${img.url}`,
    alt: img.alternativeText || product.name
  })) || [];

  const handleAddToCart = async () => {
    if (isInquiryOnly) return;
    
    setIsAddingToCart(true);
    
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      period: product.period,
      description: product.description,
      materials: product.materials,
      origin: product.origin,
      dimensions: product.dimensions,
      designer: product.designer,
      price: actualPrice,
      slug: product.slug,
      main_image: product.images && product.images.length > 0 ? {
        data: {
          id: 1,
          attributes: {
            name: product.images[0].alternativeText || product.name,
            alternativeText: product.images[0].alternativeText || null,
            caption: null,
            width: 800,
            height: 600,
            formats: {},
            hash: '',
            ext: '.jpg',
            mime: 'image/jpeg',
            size: 0,
            url: product.images[0].url,
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      } : undefined
    };
    
    try {
      addToCart(cartProduct);
      setIsAddingToCart(false);
      setShowSuccessModal(true);
      setLastAction('cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      setIsAddingToCart(false);
    }
  };

  const handleAddToInquiry = async () => {
    const inquiryProduct = {
      id: product.id,
      name: product.name,
      period: product.period,
      description: product.description,
      materials: product.materials,
      origin: product.origin,
      dimensions: product.dimensions,
      designer: product.designer,
      price: actualPrice,
      slug: product.slug,
      main_image: product.images && product.images.length > 0 ? {
        data: {
          id: 1,
          attributes: {
            name: product.images[0].alternativeText || product.name,
            alternativeText: product.images[0].alternativeText || null,
            caption: null,
            width: 800,
            height: 600,
            formats: {},
            hash: '',
            ext: '.jpg',
            mime: 'image/jpeg',
            size: 0,
            url: product.images[0].url,
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      } : undefined
    };

    try {
      addToInquiry(inquiryProduct);
      setShowSuccessModal(true); // Re-use success modal for inquiry
      setLastAction('inquiry');
    } catch (error) {
      console.error('Error adding to inquiry:', error);
    }
  };

  const handleAddToCollection = async () => {
    const collectionProduct: CartProduct = {
      id: product.id,
      name: product.name,
      period: product.period,
      description: product.description,
      materials: product.materials,
      origin: product.origin,
      dimensions: product.dimensions,
      designer: product.designer,
      price: actualPrice,
      slug: product.slug,
      main_image: product.images && product.images.length > 0 ? {
        data: {
          id: 1,
          attributes: {
            name: product.images[0].alternativeText || product.name,
            alternativeText: product.images[0].alternativeText || null,
            caption: null,
            width: 800,
            height: 600,
            formats: {},
            hash: '',
            ext: '.jpg',
            mime: 'image/jpeg',
            size: 0,
            url: product.images[0].url,
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      } : undefined
    };

    try {
      addToCollection(collectionProduct);
      setShowSuccessModal(true);
      setLastAction('collection');
    } catch (error) {
      console.error('Error adding to collection:', error);
    }
  };

  const toggleIntroExpanded = () => {
    setIsIntroExpanded(!isIntroExpanded);
  };

  const details = [
    { label: 'Dimensions:', value: product.dimensions },
    { label: 'Period:', value: product.period },
    { label: 'Origin:', value: product.origin },
    { label: 'Materials:', value: product.materials },
    { label: 'Designer:', value: product.designer },
  ].filter(detail => detail.value && detail.value.trim() !== ''); // 过滤掉空值

  return (
    <>
      <div className={styles.productDetailContainer}>
        {/* 左侧图片列 */}
        <div className={styles.imageColumn}>
          {images.length > 0 ? (
            images.map((image, index) => (
              <div key={index} className={styles.imageWrapper}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={600}
                  height={800}
                  className={styles.image}
                  priority={index === 0}
                  unoptimized
                />
              </div>
            ))
          ) : (
            <div className={styles.noImages}>
              <p>No images available for this product.</p>
            </div>
          )}
          </div>

        {/* 右侧文字信息列 */}
        <div className={styles.textColumn}>
          <div className={styles.productInfoContent}>
            <h1 className={styles.productTitle}>{product.name}</h1>
            
            <div className={styles.priceContainer}>
              {!isInquiryOnly && actualPrice > 0 ? (
                <div className={styles.price}>
                  ${actualPrice.toLocaleString()}
                </div>
              ) : (
                <div className={styles.inquiryPrice}>
                  Price on inquiry
                </div>
              )}
            </div>

            {/* Introduction 部分 - 现在在产品详情之前 */}
            {product.description && (
              <div className={styles.introduction}>
                <div className={`${styles.introductionText} ${!isIntroExpanded ? styles.collapsed : ''}`}>
                  {product.description}
                </div>
                <button
                  onClick={toggleIntroExpanded}
                  className={styles.readMoreButton}
                >
                  {isIntroExpanded ? 'Read less' : 'Read more'}
                </button>
            </div>
            )}

            <div className={styles.productDetails}>
              {details.map((detail, index) => (
                <div key={index} className={styles.detailItem}>
                  <span className={styles.detailLabel}>{detail.label}</span>
                  <span className={styles.detailValue}>{detail.value}</span>
                </div>
              ))}
          </div>

          <div className={styles.productActions}>
            {isInquiryOnly ? (
              <button 
                className={`${styles.actionButton} ${styles.inquireButton}`}
                onClick={handleAddToInquiry}
              >
                <span className={styles.buttonText}>ADD TO INQUIRY</span>
              </button>
            ) : (
              <button 
                className={`${styles.actionButton} ${styles.addToCartButton}`}
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <span className={styles.buttonText}>
                  {isAddingToCart ? 'ADDING...' : 'ADD TO CART'}
                </span>
              </button>
            )}
            <button 
              className={`${styles.actionButton} ${styles.addToCollectionButton}`}
              onClick={handleAddToCollection}
            >
              <span className={styles.buttonText}>ADD TO COLLECTION</span>
            </button>
          </div>
          </div>
        </div>
      </div>

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        productName={product.name}
        actionType={lastAction}
      />
    </>
  );
}