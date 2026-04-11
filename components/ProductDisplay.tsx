'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/stores/cartStore';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import { useCollectionStore } from '@/lib/stores/collectionStore';
import { useCurrencyStore, getConvertedPrice, currencySymbolMap as globalCurrencySymbolMap } from '@/lib/stores/currencyStore';
import { Product as CartProduct } from '@/types';
import styles from '../app/products/[slug]/ProductDetailPage.module.css';
import QRCodeModal from './QRCodeModal';
import AITryOnChoiceModal from './AITryOnChoiceModal';
import { generateProductPDF } from '@/lib/utils/pdfGenerator';

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
  Manufacturer?: string; // 新增：制造商
  price?: number;
  isInquiryOnly?: boolean;
  images?: ImageItem[] | null;
  slug: string;
  vrModelUrl?: string;
  vrUsdzUrl?: string;
  currencyKeyword?: string; // 新增：货币关键字（如 CNY, USD 等）
  // 新增：AI试穿依赖的单媒体字段
  fashionImage?: ImageItem | null;
  modelImage?: ImageItem | null;
  productPDF?: ImageItem | null;
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
          <Image src="/assets/icon/success.png" alt="Success" width={48} height={48} />
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const vrPageUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/vr/${product.slug}`;
  }, [product.slug]);
  const hasVRModel = !!((product.vrModelUrl && product.vrModelUrl.trim()) || (product.vrUsdzUrl && product.vrUsdzUrl.trim()));
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || '';
    // 更偏向“手机端”的匹配，避免把 iPad 等平板误判为手机
    const isPhoneUA = /Android.+Mobile|iPhone|Windows Phone|BlackBerry/i.test(ua);
    const isSmallViewport = window.innerWidth <= 768;
    return isPhoneUA || isSmallViewport;
  };
  
  const { addToCart } = useCartStore();
  const { addToInquiry } = useInquiryStore();
  const { addToCollection } = useCollectionStore();
  const { displayCurrency, rates } = useCurrencyStore();
  
  const actualPrice = product.price || 0;
  const isInquiryOnly = product.isInquiryOnly || false;

  // 根据 currencyKeyword 计算基础货币符号
  const currencySymbolMap: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$' };
  const baseCurrency = (product.currencyKeyword || 'GBP').toUpperCase();
  const currencySymbol = currencySymbolMap[baseCurrency] || '£';

  // 预估换算后价格
  const convertedPrice = getConvertedPrice(actualPrice, displayCurrency, rates, baseCurrency);
  const displaySymbol = globalCurrencySymbolMap[displayCurrency] || displayCurrency;

  const images = product.images?.map(img => ({
    src: /^(https?:)?\/\//i.test(img.url) ? img.url : `${API_URL}${img.url}`,
    alt: img.alternativeText || product.name
  })) || [];

  // 判断媒体字段是否存在且有有效URL（兼容两种结构）
  const hasMedia = (media: any) => {
    if (!media) return false;
    const url = (media as any).url || media?.data?.attributes?.url;
    return !!(url && String(url).trim());
  };
  const hasAIInputs = hasMedia(product.fashionImage) && hasMedia(product.modelImage);

  // 解析媒体的绝对 URL
  const resolveMediaUrl = (media: any): string | null => {
    if (!media) return null;
    // 情况1：直接是对象且有 url (如 test-pdf-fetch.js 的结果)
    if (media.url) {
      const raw = media.url;
      return /^(https?:)?\/\//i.test(raw) ? raw : `${API_URL}${raw}`;
    }
    // 情况2：嵌套在 data.attributes 中 (Strapi 默认格式)
    const raw = media?.data?.attributes?.url;
    if (!raw) return null;
    return /^(https?:)?\/\//i.test(raw) ? raw : `${API_URL}${raw}`;
  };
  const fashionUrl = resolveMediaUrl(product.fashionImage);
  const modelUrl = resolveMediaUrl(product.modelImage);
  const productPDFUrl = resolveMediaUrl(product.productPDF);

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
      currencyKeyword: product.currencyKeyword || 'GBP',
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

  // 触摸事件处理函数
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }

    setTouchStartX(0);
    setTouchEndX(0);
  };

  // 切换到下一张图片
  const goToNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  // 切换到上一张图片
  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const details = [
    { label: 'Dimensions:', value: product.dimensions },
    { label: 'Period:', value: product.period },
    { label: 'Origin:', value: product.origin },
    { label: 'Materials:', value: product.materials },
    { label: 'Designer:', value: product.designer },
    { label: 'Manufacturer:', value: product.Manufacturer },
  ].filter(detail => detail.value && detail.value.trim() !== ''); // 过滤掉空值

  const handleGeneratePDF = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    try {
      await generateProductPDF(
        {
          name: product.name,
          dimensions: product.dimensions,
          period: product.period,
          origin: product.origin,
          materials: product.materials,
          designer: product.designer,
          Manufacturer: product.Manufacturer,
          description: product.description,
          images: images
        },
        '/assets/vi/cover.jpg', // You will need to put your cover image here
        '/assets/vi/back.jpg'   // You will need to put your back cover image here
      );
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // 有无描述：用于在无描述时让右侧文字块左对齐
  const hasDescription = !!(product.description && product.description.trim());

  return (
    <>
      <div className={styles.productDetailContainer}>
        {/* 左侧图片列 */}
        <div className={styles.imageColumn}>
          {images.length > 0 ? (
            <>
              {/* 桌面端：显示所有图片（垂直排列） */}
              <div className={styles.desktopImages}>
                {images.map((image, index) => (
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
                ))}
              </div>
              
              {/* 移动端：单张图片显示（支持滑动） */}
              <div className={styles.mobileImages}>
                <div 
                  className={styles.imageWrapper}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <Image
                    src={images[currentImageIndex].src}
                    alt={images[currentImageIndex].alt}
                    width={600}
                    height={800}
                    className={styles.image}
                    priority={true}
                    unoptimized
                  />
                  
                  {/* 图片指示器 */}
                  {images.length > 1 && (
                    <div className={styles.imageIndicators}>
                      {images.map((_, index) => (
                        <div
                          key={index}
                          className={`${styles.indicator} ${index === currentImageIndex ? styles.active : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setCurrentImageIndex(index);
                            }
                          }}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* 导航按钮 */}
                  {images.length > 1 && (
                    <>
                      <button
                        className={`${styles.navButton} ${styles.prevButton}`}
                        onClick={goToPreviousImage}
                        disabled={currentImageIndex === 0}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <button
                        className={`${styles.navButton} ${styles.nextButton}`}
                        onClick={goToNextImage}
                        disabled={currentImageIndex === images.length - 1}
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
                
                {/* 缩略图导航 */}
                {images.length > 1 && (
                  <div className={styles.thumbnailNav}>
                    {images.map((image, index) => (
                      <button
                        key={index}
                        className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                        onClick={() => setCurrentImageIndex(index)}
                        aria-label={`Go to image ${index + 1}`}
                      >
                        <Image
                          src={image.src}
                          alt={image.alt}
                          width={80}
                          height={80}
                          className={styles.thumbnailImage}
                          unoptimized
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.noImages}>
              <p>No images available for this product.</p>
            </div>
          )}
        </div>

        {/* 右侧文字信息列 */}
        <div className={styles.textColumn}>
          <div className={`${styles.productInfoContent} ${!hasDescription ? styles.noDescriptionContent : ''}`}>
            <h1 className={styles.productTitle}>{product.name}</h1>
            
            {/* 当非询价且有价格时显示价格与货币符号；否则不展示任何价格文案 */}
            {!isInquiryOnly && actualPrice > 0 && (
              <div className={styles.priceContainer}>
                <div className={styles.price}>
                  {displayCurrency === baseCurrency ? (
                    `${currencySymbol}${actualPrice.toLocaleString()}`
                  ) : (
                    convertedPrice ? `${displaySymbol}${convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}${actualPrice.toLocaleString()}`
                  )}
                </div>
              </div>
            )}

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

          {/* 移除原“Try on your room”按钮，改为在操作区展示 */}

          {/* 产品文档下载（前端动态生成） */}
          <div className={styles.downloadSection}>
            <button 
              onClick={handleGeneratePDF}
              className={styles.downloadLink}
              disabled={isGeneratingPDF}
              style={{ opacity: isGeneratingPDF ? 0.5 : 1, cursor: isGeneratingPDF ? 'wait' : 'pointer' }}
            >
              {isGeneratingPDF ? 'Generating PDF...' : 'Download product tearsheet'}
            </button>
          </div>

          <div className={styles.productActions}>
            {/* 当有价格时：同时展示“Add to Cart”和“Add to Inquiry”，并保证顺序为：Cart -> Inquiry -> Collection */}
            {!isInquiryOnly && (
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

            {/* 无论是否有价格，都保留 Add to Inquiry */}
            <button 
              className={`${styles.actionButton} ${styles.inquireButton}`}
              onClick={handleAddToInquiry}
            >
              <span className={styles.buttonText}>ADD TO INQUIRY</span>
            </button>
            {/* VR 入口：样式与“Add to Inquiry”一致，位于其右侧、Collection 左侧；当无 vrModelUrl 时隐藏 */}
            {hasVRModel && (
              <button
                className={`${styles.actionButton} ${styles.inquireButton}`}
                onClick={() => {
                  if (isMobileDevice()) {
                    // 移动端：直接跳转到 VR 页面
                    window.location.href = vrPageUrl;
                  } else {
                    // 桌面端：弹出二维码
                    setQrOpen(true);
                  }
                }}
              >
                <span className={styles.buttonText}>3D MODEL VIEW</span>
              </button>
            )}
            {/* 新增：AI TRY ON 按钮（当 fashionImage 和 modelImage 都存在时显示），样式参考 3D MODEL VIEW */}
            {hasAIInputs && (
              <button
                className={`${styles.actionButton} ${styles.inquireButton}`}
                onClick={() => {
                  // 打开选择弹窗，而不是直接跳转
                  setAiOpen(true);
                }}
              >
                <span className={styles.buttonText}>AI VIRTUAL TRY-ON</span>
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
      {/* 保持 QRCodeModal 功能，用于引导到 VR 路由 */}
      <QRCodeModal open={qrOpen} targetUrl={vrPageUrl} onClose={() => setQrOpen(false)} />
      <AITryOnChoiceModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSelect={(mode) => {
          setAiOpen(false);
          const target = `/ai-virtual-tryon/${product.slug}?mode=${encodeURIComponent(mode)}${fashionUrl ? `&fashion=${encodeURIComponent(fashionUrl)}` : ''}${modelUrl ? `&model=${encodeURIComponent(modelUrl)}` : ''}`;
          window.open(target, '_blank');
        }}
        productName={product.name}
        previewFashionUrl={fashionUrl || undefined}
        previewModelUrl={modelUrl || undefined}
      />
    </>
  );
}