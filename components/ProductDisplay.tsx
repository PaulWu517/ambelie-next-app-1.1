'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/stores/cartStore';
import { Product as CartProduct } from '@/types';
import styles from '../app/products/[slug]/ProductDetailPage.module.css'; // Reusing the page's CSS module

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
function SuccessModal({ isOpen, onClose, productName }: { isOpen: boolean; onClose: () => void; productName: string }) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // 3秒后自动关闭
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-modal-content">
          <div className="success-icon">✓</div>
          <h3>Added to Cart</h3>
          <p>{productName} has been added to your cart</p>
          <div className="success-modal-actions">
            <button onClick={onClose} className="continue-shopping-btn">
              Continue Shopping
            </button>
            <Link href="/cart" className="view-cart-btn">
              View Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDisplay({ product, API_URL }: ProductDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const { addToCart } = useCartStore();
  
  // 使用真实的后端数据
  const actualPrice = product.price || 0;
  const isInquiryOnly = product.isInquiryOnly || false;

  const images = product.images?.map(img => ({
    src: `${API_URL}${img.url}`,
    alt: img.alternativeText || product.name
  })) || [];

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const openLightbox = () => {
    if (images.length > 0) {
      setIsLightboxOpen(true);
    }
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const handleAddToCart = async () => {
    if (isInquiryOnly) return;
    
    setIsAddingToCart(true);
    
    // 转换数据格式以适配购物车
    const cartProduct: CartProduct = {
      id: product.id.toString(),
      name: product.name,
      period: product.period,
      description: product.description,
      materials: product.materials,
      origin: product.origin,
      dimensions: product.dimensions,
      price: actualPrice,
      slug: product.slug,
      main_image: product.images && product.images.length > 0 ? {
        data: {
          id: 1,
          attributes: {
            name: 'main_image',
            alternativeText: product.images[0].alternativeText || null,
            caption: null,
            width: 500,
            height: 667,
            formats: {},
            hash: '',
            ext: '.jpg',
            mime: 'image/jpeg',
            size: 100,
            url: product.images[0].url,
            previewUrl: null,
            provider: 'local',
            provider_metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
      } : undefined
    };
    
    try {
      addToCart(cartProduct);
      setIsAddingToCart(false);
      setShowSuccessModal(true); // 显示成功弹窗
    } catch (error) {
      console.error('Error adding to cart:', error);
      setIsAddingToCart(false);
    }
  };

  const details = [
    { label: 'Dimensions:', value: product.dimensions },
    { label: 'Period:', value: product.period },
    { label: 'Origin:', value: product.origin },
    { label: 'Materials:', value: product.materials },
  ];

  return (
    <>
      <div className={styles.productDetailContainer}>
        <div className={styles.productGallery}>
          <div className={styles.mainImageContainer}>
            <button className={`${styles.galleryNav} ${styles.prevButton}`} onClick={handlePrevImage}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className={styles.mainImage} onClick={openLightbox} style={{ cursor: 'zoom-in' }}>
              {images.map((image, index) => (
                <Image
                  key={index}
                  src={image.src}
                  alt={image.alt}
                  fill
                  style={{ objectFit: 'contain' }}
                  className={index === currentImageIndex ? styles.active : ''}
                  priority={index === 0}
                />
              ))}
            </div>
            <button className={`${styles.galleryNav} ${styles.nextButton}`} onClick={handleNextImage}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          <div className={styles.imageZoomInfo}>
            <span>Click to zoom</span>
          </div>
        </div>

        {isLightboxOpen && (
          <div className={styles.lightboxOverlay} onClick={closeLightbox}>
            <button className={styles.lightboxClose} onClick={closeLightbox}>
              &times;
            </button>
            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <button className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={handlePrevImage}>
                &#10094;
              </button>
              <div className={styles.lightboxImageContainer}>
                <Image
                  src={images[currentImageIndex].src}
                  alt={images[currentImageIndex].alt}
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <button className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={handleNextImage}>
                &#10095;
              </button>
            </div>
          </div>
        )}

        <div className={styles.productInfoSticky}>
          <div className={styles.productInfoContent}>
            <h1 className={styles.productTitle}>{product.name}</h1>
            
            <div className={styles.priceContainer} style={{ marginBottom: '20px' }}>
              {!isInquiryOnly && actualPrice > 0 ? (
                <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: 'var(--brand-green)' }}>
                  ${actualPrice.toLocaleString()}
                </div>
              ) : (
                <div style={{ fontSize: '1.2em', fontStyle: 'italic', color: '#666' }}>
                  Price on inquiry
                </div>
              )}
            </div>

            <div className={styles.thumbnailGallery}>
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                  onClick={() => handleThumbnailClick(index)}
                >
                  <Image src={image.src} alt={`Thumbnail ${index + 1}`} width={85} height={113} style={{objectFit: 'cover'}} />
                </div>
              ))}
            </div>

            <div className={styles.productDetails}>
              {details.map((detail, index) => (
                <div key={index} className={styles.detailItem}>
                  <span className={styles.detailLabel}>{detail.label}</span>
                  <span className={styles.detailValue}>{detail.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.productActions}>
            {isInquiryOnly ? (
              <Link href="/contact" className={styles.actionButton}>
                <span className={styles.buttonText}>Inquire</span>
              </Link>
            ) : (
              <button 
                className={styles.actionButton}
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <span className={styles.buttonText}>
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </span>
              </button>
            )}
            <button className={styles.actionButton}>
              <span className={styles.buttonText}>AR VIEWING</span>
            </button>
          </div>
        </div>
      </div>

      {/* 成功弹窗 */}
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        productName={product.name}
      />
    </>
  );
} 