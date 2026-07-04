'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import { useAuth } from '@/lib/hooks/useAuth';
import styles from './inquiry.module.css';

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

const InquiryPage = () => {
  const { items, removeFromInquiry, getItemCount, clearInquiry, loadFromBackend, submitInquiry } = useInquiryStore();
  const { user, isLoggedIn } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    company: '', // 保留但不显示，用于兼容后端
    subject: 'Product Inquiry', // 设置默认值
    message: '' // 保留但不显示，用于兼容后端
  });

  // 已登录用户从后端同步问询清单；未登录用户保留本地列表。
  useEffect(() => {
    if (isLoggedIn) {
      loadFromBackend();
    }
  }, [isLoggedIn, loadFromBackend]);

  // 当用户登录时，自动填充表单信息
  useEffect(() => {
    if (isLoggedIn && user) {
      setCustomerInfo(prev => ({
        ...prev,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      }));
    }
  }, [isLoggedIn, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert('Please add items to your inquiry list first');
      return;
    }

    if (!customerInfo.email || !customerInfo.firstName) {
      alert('Please fill in required fields: Email and First Name');
      return;
    }

    setIsSubmitting(true);
    
    // 立即显示成功状态，避免等待后端响应的延迟
    setSubmitSuccess(true);

    try {
      // 异步提交到后端，不阻塞UI
      const submitPromise = submitInquiry({
        email: customerInfo.email,
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phone: customerInfo.phone,
        message: customerInfo.message || 'Product inquiry request'
      });

      // 异步发送邮件通知
      const inquiryData = {
        customerInfo,
        inquiryItems: items,
        submissionDate: new Date().toISOString(),
        totalItems: items.length
      };

      const emailPromise = fetch('/api/inquiry/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryData),
      });

      // 等待两个请求完成，但不阻塞UI显示
      Promise.all([submitPromise, emailPromise]).then(([backendSuccess, emailResponse]) => {
        if (backendSuccess && emailResponse.ok) {
          console.log('Inquiry submitted and email sent successfully');
        } else {
          console.warn('Some operations may have failed, but inquiry was processed');
        }
        // 重新从后端加载数据以确保同步
        loadFromBackend();
      }).catch(error => {
        console.error('Background submission error:', error);
      });
      
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      // 如果出错，恢复到原始状态
      setSubmitSuccess(false);
      alert('Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 添加自动跳转功能
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  if (submitSuccess) {
    return (
      <main className={styles.mainContainer}>
        <div className={styles.successContainer}>
          <div className={styles.successCard}>
            <h1 className={styles.successTitle}>Thank you for your inquiry</h1>
            <p className={styles.successMessage}>
              Our team will be in touch with you shortly.
            </p>
            <div className={styles.successButtonContainer}>
              <Link href="/" className={styles.successButton}>
                Back to Home
              </Link>
            </div>
            <p className={styles.redirectMessage}>
              You will be redirected to the homepage in 3 seconds...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.mainContainer}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>
          PRODUCT INQUIRY
        </h1>
        
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>
              Your inquiry list is empty
            </h2>
            <p className={styles.emptyMessage}>
              Browse our products and click "INQUIRE" to add items to your inquiry list
            </p>
            <Link href="/products" className={styles.browseButton}>
              Browse Products
            </Link>
          </div>
        ) : (
          <div className={styles.contentGrid}>
            {/* 左侧：询价商品列表 */}
            <div className={styles.inquiryList}>
              <h2 className={styles.listTitle}>
                Inquiry List ({getItemCount()} items)
              </h2>
              
              <div className={styles.listContainer}>
                {items.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={styles.listItem}
                  >
                    {/* 商品图片 */}
                    <div className={styles.itemImage}>
                      {(() => {
                        // 构建图片URL - 适配两种数据结构
                        let imageUrl = null;
                        
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
                        
                        return imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={item.name}
                            width={80}
                            height={80}
                            className={styles.itemImageElement}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="no-image">No Image</div>';
                              }
                            }}
                          />
                         ) : (
                           <div className="no-image">No Image</div>
                         );
                       })()}
                    </div>
                    
                    {/* 商品信息 */}
                    <div className={styles.itemInfo}>
                      <h3 className={styles.itemName}>
                        {item.name}
                      </h3>
                      {item.period && (
                        <p className={styles.itemDetail}>
                          Period: {item.period}
                        </p>
                      )}
                      {item.dimensions && (
                        <p className={styles.itemDetail}>
                          Dimensions: {item.dimensions}
                        </p>
                      )}
                      {item.materials && (
                        <p className={styles.itemDetail}>
                          Materials: {item.materials}
                        </p>
                      )}
                      {item.origin && (
                        <p className={styles.itemDetail}>
                          Origin: {item.origin}
                        </p>
                      )}
                      {item.designer && (
                        <p className={styles.itemDetail}>
                          Designer: {item.designer}
                        </p>
                      )}
                      <p className={styles.itemDate}>
                        Added: {new Date(item.inquiryDate).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    
                    {/* 价格和移除按钮 */}
                    <div className={styles.itemActions}>
                      <div className={styles.itemPrice}>
                        {item.price && typeof item.price === 'number' && item.price > 0 ? `$${item.price.toLocaleString()}` : 'Price on inquiry'}
                      </div>
                      <button
                        onClick={() => removeFromInquiry(item.slug)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：联系表单 */}
            <div className={styles.contactForm}>
              <div className={styles.formContainer}>
                <h3 className={styles.formTitle}>
                  Contact Information
                </h3>
                
                <form onSubmit={handleSubmitInquiry} className={styles.form}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={customerInfo.email}
                      onChange={handleInputChange}
                      required
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.nameFields}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={customerInfo.firstName}
                        onChange={handleInputChange}
                        required
                        className={styles.formInput}
                      />
                    </div>
                    
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={customerInfo.lastName}
                        onChange={handleInputChange}
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerInfo.phone}
                      onChange={handleInputChange}
                      className={styles.formInput}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${styles.submitButton} ${isSubmitting ? styles.submitting : ''}`}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default InquiryPage;
