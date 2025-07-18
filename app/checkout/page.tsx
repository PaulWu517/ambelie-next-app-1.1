'use client';

import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { useCartStore } from '@/lib/stores/cartStore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import getStripe from '@/lib/stripe';

// import CheckoutForm from '../components/CheckoutForm'; // 暂时注释，稍后实现

// 获取Stripe实例
const stripePromise = getStripe();

const CheckoutPage = () => {
  const { items, getCartTotal, getItemCount, clearCart } = useCartStore();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    name: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  // 当用户信息加载完成后，自动填充表单
  useEffect(() => {
    if (isLoggedIn && user) {
      setCustomerInfo(prev => ({
        ...prev,
        email: user.email || '',
        name: user.name || '',
        phone: user.phone || '',
      }));
    }
  }, [isLoggedIn, user]);

  // 如果购物车为空，重定向到购物车页面
  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  // 处理创建支付会话
  const handleCreateCheckoutSession = async () => {
    setLoading(true);
    
    try {
      // 验证必需字段
      if (!customerInfo.email || !customerInfo.name) {
        alert('请填写邮箱和姓名');
        setLoading(false);
        return;
      }

      // 构建订单项
      const orderItems = items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price || 0,
        productName: item.name
      }));

      // 准备请求头，如果用户已登录则添加认证token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 尝试获取用户token（无论是否登录都尝试）
      console.log('=== 支付流程开始 ===');
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
      
      try {
        console.log('正在获取用户token...');
        const tokenResponse = await fetch('/api/auth/get-token', {
          method: 'GET',
          credentials: 'include',
        });
        
        console.log('Token响应状态:', tokenResponse.status);
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          console.log('Token数据:', tokenData);
          
          if (tokenData.success && tokenData.token) {
            headers.Authorization = `Bearer ${tokenData.token}`;
            console.log('✅ 使用认证token进行支付:', tokenData.source);
            console.log('Token长度:', tokenData.token.length);
          } else {
            console.log('⚠️ 游客模式支付:', tokenData.message || 'No valid token');
          }
        } else {
          console.log('❌ Token请求失败:', tokenResponse.status);
        }
      } catch (tokenError) {
        console.log('❌ 无法获取token，继续作为游客:', tokenError);
      }

      // 调用后端API创建支付会话
      const paymentUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-checkout-session`;
      const paymentPayload = {
        orderItems,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
        metadata: {
          customerPhone: customerInfo.phone,
          items: JSON.stringify(orderItems)
        }
      };
      
      console.log('=== 支付API请求 ===');
      console.log('请求URL:', paymentUrl);
      console.log('请求头:', headers);
      console.log('请求体:', paymentPayload);
      
      const response = await fetch(paymentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentPayload),
      });
      
      console.log('支付API响应状态:', response.status);
      console.log('响应头:', Object.fromEntries(response.headers.entries()));
      
      const responseData = await response.json();
      console.log('支付API响应数据:', responseData);
      
      const { success, data } = responseData;

      if (success && data.url) {
        // 重定向到Stripe Checkout
        if (typeof window !== 'undefined') {
        window.location.href = data.url;
        }
      } else {
        throw new Error('创建支付会话失败');
      }
    } catch (error) {
      console.error('支付失败:', error);
      alert('支付初始化失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const subtotal: number = getCartTotal();
  const shipping: number = 0; // 暂时设为免费配送
  const tax: number = subtotal * 0.1; // 10% 税率
  const total: number = subtotal + shipping + tax;

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="section-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <h1 className="section-heading" style={{ marginBottom: '40px', textAlign: 'center' }}>
          CHECKOUT
        </h1>



        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '60px' }}>
          {/* 左侧：客户信息表单 */}
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '500' }}>
              Customer Information
            </h2>
            
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: '500' }}>
                Contact Information
              </h3>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                    required
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
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
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: '500' }}>
                Shipping Address
              </h3>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.9rem' }}>
                Note: Shipping address will be collected securely through Stripe checkout.
              </p>
            </div>

            <button
              onClick={handleCreateCheckoutSession}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#ccc' : 'var(--brand-black)',
                color: 'white',
                padding: '15px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>

          {/* 右侧：订单摘要 */}
          <div>
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '30px',
              backgroundColor: '#f9f9f9'
            }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: '500' }}>
                Order Summary
              </h3>
              
              {/* 商品列表 */}
              <div style={{ marginBottom: '20px' }}>
                {items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                    paddingBottom: '15px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '500', marginBottom: '5px' }}>{item.name}</p>
                      <p style={{ fontSize: '0.9rem', color: '#666' }}>
                        Qty: {item.quantity} × ${(item.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div style={{ fontWeight: '500' }}>
                      ${((item.price || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* 费用明细 */}
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Subtotal ({getItemCount()} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  borderTop: '1px solid #ddd',
                  paddingTop: '15px'
                }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--brand-green)' }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;