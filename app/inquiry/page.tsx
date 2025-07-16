'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import { useAuth } from '@/lib/hooks/useAuth';

const InquiryPage = () => {
  const { items, removeFromInquiry, getItemCount, clearInquiry } = useInquiryStore();
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

    try {
      // 构建询价邮件内容
      const inquiryData = {
        customerInfo,
        inquiryItems: items,
        submissionDate: new Date().toISOString(),
        totalItems: items.length
      };

      // 发送询价邮件到后端
      const response = await fetch('/api/inquiry/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryData),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        // 清空询价清单
        clearInquiry();
      } else {
        throw new Error('Failed to send inquiry');
      }
    } catch (error) {
      console.error('Failed to send inquiry:', error);
      alert('Failed to send inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <main style={{ paddingTop: '80px', paddingBottom: '100px' }}>
        <div className="section-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 50px', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#f0f8ff', padding: '40px', borderRadius: '10px', marginBottom: '40px' }}>
            <div style={{ fontSize: '48px', color: '#4caf50', marginBottom: '20px' }}>✓</div>
            <h1 style={{ fontSize: '2rem', marginBottom: '20px', color: '#333' }}>Inquiry Sent Successfully!</h1>
            <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '30px' }}>
              We have received your inquiry and will respond within 24 hours. Thank you for your interest in AMBELIE!
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <Link 
                href="/" 
                style={{
                  display: 'inline-block',
                  backgroundColor: '#333',
                  color: 'white',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: '500'
                }}
              >
                Back to Home
              </Link>
              <Link 
                href="/products" 
                style={{
                  display: 'inline-block',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: '500'
                }}
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ paddingTop: '80px', paddingBottom: '100px' }}>
      <div className="section-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 50px' }}>
        <h1 className="section-heading" style={{ marginBottom: '40px', textAlign: 'center' }}>
          PRODUCT INQUIRY
        </h1>
        
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#666' }}>
              Your inquiry list is empty
            </h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px', color: '#999' }}>
              Browse our products and click "INQUIRE" to add items to your inquiry list
            </p>
            <Link 
              href="/products" 
              style={{
                display: 'inline-block',
                backgroundColor: '#333',
                color: 'white',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '5px',
                fontWeight: '500'
              }}
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '60px' }}>
            {/* 左侧：询价商品列表 */}
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '500' }}>
                Inquiry List ({getItemCount()} items)
              </h2>
              
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                {items.map((item, index) => (
                  <div 
                    key={item.id} 
                    style={{
                      display: 'flex',
                      padding: '20px',
                      borderBottom: index < items.length - 1 ? '1px solid #eee' : 'none',
                      alignItems: 'center'
                    }}
                  >
                    {/* 商品图片 */}
                    <div style={{ width: '80px', height: '80px', marginRight: '20px' }}>
                      {item.main_image?.data?.attributes?.url ? (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app'}${item.main_image.data.attributes.url}`}
                          alt={item.name}
                          width={80}
                          height={80}
                          style={{ objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          backgroundColor: '#f0f0f0', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999'
                        }}>
                          No Image
                        </div>
                      )}
                    </div>
                    
                    {/* 商品信息 */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '8px' }}>
                        {item.name}
                      </h3>
                      {item.period && (
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.9rem' }}>
                          Period: {item.period}
                        </p>
                      )}
                      {item.dimensions && (
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.9rem' }}>
                          Dimensions: {item.dimensions}
                        </p>
                      )}
                      {item.materials && (
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.9rem' }}>
                          Materials: {item.materials}
                        </p>
                      )}
                      {item.origin && (
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.9rem' }}>
                          Origin: {item.origin}
                        </p>
                      )}
                      {item.designer && (
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '0.9rem' }}>
                          Designer: {item.designer}
                        </p>
                      )}
                      <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: '0.8rem' }}>
                        Added: {new Date(item.inquiryDate).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    
                    {/* 价格和移除按钮 */}
                    <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                      <div style={{ marginBottom: '10px', fontSize: '1rem', fontWeight: '500' }}>
                        {item.price && item.price > 0 ? `$${item.price.toLocaleString()}` : 'Price on inquiry'}
                      </div>
                      <button
                        onClick={() => removeFromInquiry(item.id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：联系表单 */}
            <div>
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '30px',
                backgroundColor: '#f9f9f9'
              }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: '500' }}>
                  Contact Information
                </h3>
                
                <form onSubmit={handleSubmitInquiry}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={customerInfo.email}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={customerInfo.firstName}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={customerInfo.lastName}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerInfo.phone}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      backgroundColor: isSubmitting ? '#ccc' : '#333',
                      color: 'white',
                      padding: '15px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      fontWeight: '500',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.3s ease'
                    }}
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