'use client';

import React, { useState, useEffect } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useCartStore } from '@/lib/stores/cartStore';
import { useCurrencyStore, getConvertedPrice, currencySymbolMap as globalCurrencySymbolMap } from '@/lib/stores/currencyStore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import getStripe from '@/lib/stripe';

// import CheckoutForm from '../components/CheckoutForm'; // 暂时注释，稍后实现

// 获取Stripe实例
const stripePromise = getStripe();

const CheckoutPage = () => {
  const { items, getCartTotal, getItemCount, clearCart } = useCartStore();
  const { displayCurrency, rates } = useCurrencyStore();
  const displaySymbol = globalCurrencySymbolMap[displayCurrency] || displayCurrency;
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
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

  // 如果购物车为空，重定向到购物车页面（在 effect 中进行，避免渲染期触发路由）
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items.length, router]);

  if (items.length === 0) {
    return null;
  }

  // 处理创建支付会话
  const handleCreateCheckoutSession = async () => {
    setLoading(true);
    
    try {
      // 验证必需字段
      if (!customerInfo.email || !customerInfo.name || !customerInfo.phone) {
        alert('请填写邮箱、姓名和手机号');
        setLoading(false);
        return;
      }

      // 构建订单项
      const orderItems = items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: displayCurrency !== cartCurrency && rates[displayCurrency] ? getConvertedPrice(item.price || 0, displayCurrency, rates, cartCurrency) : (item.price || 0),
        productName: item.name
      }));

      // 准备请求头，如果用户已登录则添加认证token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 使用正确的API URL，提供多个回退选项
      const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';
      
      // 尝试获取用户token（无论是否登录都尝试）
      console.log('=== 支付流程开始 ===');
      console.log('API URL:', apiUrl);
      
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
      const paymentUrl = `${apiUrl}/api/payments/create-checkout-session`;
      const paymentPayload = {
        orderItems,
        currency: displayCurrency, // 强制使用当前选择的货币，抛弃比较逻辑
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/orders`,
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

      if (success && data.clientSecret) {
        // 使用 Embedded Checkout 模式
        setClientSecret(data.clientSecret);
      } else if (success && data.url) {
        // 退回到重定向模式
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
  const currencySymbolMap: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$' };
  const cartCurrency = (items[0]?.currencyKeyword || 'GBP').toUpperCase();
  const currencySymbol = currencySymbolMap[cartCurrency] || '';
  const total: number = subtotal + shipping; // 取消税费计算

  // 如果已经获取到 clientSecret，则显示 Stripe Embedded Checkout 界面
  if (clientSecret) {
    return (
      <div className="checkout-page-root" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
        <div className="section-container">
          <h1 className="section-heading" style={{ marginBottom: '40px', textAlign: 'center' }}>
            COMPLETE PAYMENT
          </h1>
          <button 
            onClick={() => setClientSecret('')}
            style={{ 
              marginBottom: '20px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ← Back to Order Summary
          </button>
          <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-root" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="section-container">
        <h1 className="section-heading" style={{ marginBottom: '40px', textAlign: 'center' }}>
          CHECKOUT
        </h1>


        <div className="checkout-grid">
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
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
                
                <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
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
                      Phone Number *
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
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: '500' }}>
                Shipping Address
              </h3>
              <p style={{ color: '#666', marginBottom: '8px', fontSize: '0.9rem' }}>
                Shipping address will be collected securely through Stripe checkout.
              </p>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.9rem' }}>
                We will arrange the transport on our side.
              </p>
            </div>

            
          </div>

          {/* 右侧：订单摘要 */}
          <div>
            <div className="summary-card" style={{
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
                        Qty: {item.quantity} × {currencySymbol}{(item.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  <div style={{ fontWeight: '500', textAlign: 'right' }}>
                    {displayCurrency === cartCurrency ? (
                      <div>{currencySymbol}{((item.price || 0) * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    ) : (
                      rates[displayCurrency] ? (
                        <div>{displaySymbol}{getConvertedPrice((item.price || 0) * item.quantity, displayCurrency, rates, cartCurrency)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      ) : (
                        <div>{currencySymbol}{((item.price || 0) * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      )
                    )}
                  </div>
                </div>
                ))}
              </div>

              {/* 费用明细 */}
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Subtotal ({getItemCount()} items)</span>
                  <div style={{ textAlign: 'right' }}>
                    {displayCurrency === cartCurrency ? (
                      <div>{currencySymbol}{subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    ) : (
                      rates[displayCurrency] ? (
                        <div>{displaySymbol}{getConvertedPrice(subtotal, displayCurrency, rates, cartCurrency)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      ) : (
                        <div>{currencySymbol}{subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      )
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Shipping</span>
                  <div style={{ textAlign: 'right' }}>
                    {displayCurrency === cartCurrency ? (
                      <div>{shipping === 0 ? 'Free UK Delivery' : `${currencySymbol}${shipping.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</div>
                    ) : (
                      rates[displayCurrency] ? (
                        <div>{shipping === 0 ? 'Free UK Delivery' : `${displaySymbol}${getConvertedPrice(shipping, displayCurrency, rates, cartCurrency)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</div>
                      ) : (
                        <div>{shipping === 0 ? 'Free UK Delivery' : `${currencySymbol}${shipping.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</div>
                      )
                    )}
                  </div>
                </div>
                
                {/* Tax removed per requirements */}
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  borderTop: '1px solid #ddd',
                  paddingTop: '15px'
                }}>
                  <span>Total</span>
                  <div style={{ textAlign: 'right' }}>
                    {displayCurrency === cartCurrency ? (
                      <div style={{ color: 'var(--brand-green)' }}>{currencySymbol}{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    ) : (
                      rates[displayCurrency] ? (
                        <div style={{ color: 'var(--brand-green)' }}>{displaySymbol}{getConvertedPrice(total, displayCurrency, rates, cartCurrency)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      ) : (
                        <div style={{ color: 'var(--brand-green)' }}>{currencySymbol}{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      )
                    )}
                  </div>
                </div>

                {/* 移动 Continue to Payment 按钮到订单摘要卡片下方 */}
                <button
                  onClick={handleCreateCheckoutSession}
                  disabled={loading}
                  style={{
                    width: '100%',
                    marginTop: '20px',
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
            </div>
          </div>
        </div>
        <style jsx>{`
          .checkout-page-root { overflow-x: hidden; }
          .section-container { box-sizing: border-box; max-width: 1200px; margin: 0 auto; padding: 0 20px; width: 100%; }
          .checkout-grid { display: grid; grid-template-columns: 1fr 400px; gap: 60px; width: 100%; }
          .summary-card { width: 100%; max-width: 100%; box-sizing: border-box; }
          @media (max-width: 1024px) {
            .section-container { padding: 0 16px !important; }
            .checkout-grid { grid-template-columns: 1fr; gap: 32px; }
            .two-col-grid { grid-template-columns: 1fr !important; gap: 16px; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CheckoutPage;