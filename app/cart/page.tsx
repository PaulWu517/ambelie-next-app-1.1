'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/stores/cartStore';
import { useCurrencyStore, getConvertedPrice, currencySymbolMap as globalCurrencySymbolMap } from '@/lib/stores/currencyStore';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

const CartPage = () => {
  const { items, removeFromCart, updateQuantity, getCartTotal, getItemCount, loadFromBackend, isLoading } = useCartStore();
  const { displayCurrency, rates } = useCurrencyStore();
  const displaySymbol = globalCurrencySymbolMap[displayCurrency] || displayCurrency;

  const currencySymbolMap: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$' };
  const cartCurrency = (items[0]?.currencyKeyword || 'GBP').toUpperCase();
  const subtotalSymbol = currencySymbolMap[cartCurrency] || '';

  useEffect(() => {
    loadFromBackend();
  }, []);

  return (
    <main className="cart-page" style={{ paddingBottom: '100px' }}>
      <div className="cart-container">
                <h1 className="cart-title">Shopping Cart</h1>

        {/* 页面局部样式：避免使用 global.css 的标题和容器样式 */}
        <style jsx>{`
          .cart-page { overflow-x: hidden; }
          /* 整体向下移动一点 */
          .cart-container { box-sizing: border-box; max-width: 1200px; margin: 40px auto 0; padding: 0 50px; width: 100%; }
          /* 宽度加宽为 75% */
          .cart-title { width: 90%; margin: 0 auto 40px; text-align: left; font-family: var(--font-heading); font-size: 2.2em; color: var(--brand-black); }
          .cart-grid { width: 90%; margin: 0 auto; }
          /* 空状态与标题对齐 */
          .empty-state { width: 90%; margin: 0 auto; text-align: left; }
          .empty-text { font-size: 1.2em; margin-bottom: 20px; color: #666; }
          .empty-link { color: var(--brand-green); text-decoration: underline; }
          /* 使用固定比例列，确保表头与数据列一致（避免 auto 导致不同行计算不同） */
          .cart-header, .cart-item { gap: 20px; grid-template-columns: 2fr 1fr 1fr 1fr 0.8fr; justify-items: start; }
          .cart-header > div, .cart-item > div { text-align: left; }

          @media (max-width: 768px) {
            .cart-container { padding: 0 16px; margin-top: 24px; }
            .cart-title { width: 100%; margin: 0 0 24px; }
            .cart-grid { width: 100%; }
            .empty-state { width: 100%; }
            .cart-header { grid-template-columns: 1.4fr 0.8fr 0.8fr 0.8fr 0.8fr; gap: 12px; font-size: 0.9rem; justify-items: start; }
            .cart-item { grid-template-columns: 1.4fr 0.8fr 0.8fr 0.8fr 0.8fr; gap: 12px; justify-items: start; }
            .cart-item .remove-button { white-space: nowrap; }
            .cart-header > div, .cart-item > div { text-align: left; }
            .product-info { flex-direction: column; align-items: flex-start; }
            .product-image { margin-right: 0; max-width: 120px; width: 100%; }
            .quantity-input input { width: 56px; }
            .checkout-bar { display: block; }
            .checkout-summary { width: 100%; }
          }
        `}</style>
        
        {isLoading ? (
          <div className="empty-state">
            <p className="empty-text">Loading cart from backend…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">Your cart is empty</p>
            <Link href="/products" className="empty-link">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            {/* 表格标题 */}
            <div className="cart-header" style={{ 
              display: 'grid', 
              fontWeight: 'bold', 
              borderBottom: '1px solid #ddd', 
              paddingBottom: '15px', 
              marginBottom: '20px',
              fontFamily: 'var(--font-body)'
            }}>
              <div>Product</div>
              <div>Price</div>
              <div>Quantity</div>
              <div>Total</div>
              <div></div>
            </div>

            {/* 商品列表 */}
            {items.map((item) => { 
              const symbol = currencySymbolMap[(item.currencyKeyword || cartCurrency).toUpperCase()] || '';
              return (
              <div key={item.id} className="cart-item" style={{ 
                display: 'grid', 
                alignItems: 'center', 
                borderBottom: '1px solid #eee', 
                paddingTop: '20px', 
                paddingBottom: '20px' 
              }}>
                <div className="product-info" style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="product-image" style={{ 
                    width: '80px', 
                    height: '100px', 
                    marginRight: '15px', 
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    <Image
                      src={(() => {
                        // 详细调试：输出购物车item的完整数据结构
                        console.log('🛒 [Cart Debug] Item data:', JSON.stringify(item, null, 2));
                        console.log('🖼️ [Cart Debug] Main image data:', JSON.stringify(item.main_image, null, 2));
                        
                        const preferredUrl = (() => {
                          const img: any = item.main_image;
                          const nested = img?.data?.attributes?.url;
                          const direct = typeof img?.url === 'string' ? img.url : undefined;
                          return nested || direct;
                        })();
                        const imageUrl = preferredUrl
                          ? (preferredUrl.startsWith('http') ? preferredUrl : `${API_URL}${preferredUrl}`)
                          : '/placeholder.jpg';
                        
                        console.log('🌐 [Cart Debug] Final image URL for', item.name, ':', imageUrl);
                        console.log('📊 [Cart Debug] URL analysis:', {
                          hasMainImage: !!item.main_image,
                          // 以下为宽松类型检查输出（img 可能是任意形态）
                          hasData: !!(item as any)?.main_image?.data,
                          hasAttributes: !!(item as any)?.main_image?.data?.attributes,
                          hasUrl: !!preferredUrl,
                          startsWithHttp: preferredUrl?.startsWith('http'),
                          finalUrl: imageUrl
                        });
                        
                        return imageUrl;
                      })()
                      }
                      alt={item.name ?? 'Product image'}
                      width={80}
                      height={100}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.error('❌ [Cart Debug] Image load failed for:', item.name);
                        target.src = '/placeholder.jpg';
                      }}
                      onLoad={() => {
                        console.log('✅ [Cart Debug] Image loaded successfully for:', item.name);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '5px',
                      fontSize: '1em',
                      lineHeight: '1.3',
                      wordWrap: 'break-word'
                    }}>{item.name}</p>
                    <p style={{ 
                      fontSize: '0.9em', 
                      color: '#666',
                      lineHeight: '1.2'
                    }}>{item.period}</p>
                  </div>
                </div>
                <div style={{ 
                  fontFamily: 'var(--font-body)', 
                  color: 'var(--brand-green)',
                  fontWeight: '500',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {displayCurrency === cartCurrency ? (
                    <span>{symbol}{item.price?.toFixed(2) || '0.00'}</span>
                  ) : (
                    rates[displayCurrency] ? (
                      <span>{displaySymbol}{getConvertedPrice(item.price || 0, displayCurrency, rates, cartCurrency)?.toFixed(2)}</span>
                    ) : (
                      <span>{symbol}{item.price?.toFixed(2) || '0.00'}</span>
                    )
                  )}
                </div>
                <div className="quantity-input">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id.toString(), parseInt(e.target.value, 10))}
                    style={{ 
                      width: '60px', 
                      padding: '8px 5px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px', 
                      textAlign: 'center',
                      fontSize: '0.9em'
                    }}
                  />
                </div>
                <div style={{ 
                  fontFamily: 'var(--font-body)', 
                  fontWeight: 'bold',
                  fontSize: '1em',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {displayCurrency === cartCurrency ? (
                    <span>{symbol}{((item.price || 0) * item.quantity).toFixed(2)}</span>
                  ) : (
                    rates[displayCurrency] ? (
                      <span>{displaySymbol}{getConvertedPrice((item.price || 0) * item.quantity, displayCurrency, rates, cartCurrency)?.toFixed(2)}</span>
                    ) : (
                      <span>{symbol}{((item.price || 0) * item.quantity).toFixed(2)}</span>
                    )
                  )}
                </div>
                <div>
                  <button
                    className="remove-button"
                    onClick={() => removeFromCart(item.id.toString())}
                    style={{ 
                      color: '#dc3545', 
                      backgroundColor: '#fdecec', 
                      border: '1px solid #f6c7c7', 
                      cursor: 'pointer', 
                      fontSize: '0.9em',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#fbd5d5';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#fdecec';
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              );
            })}

            {/* 样式已上移到容器级别，保证标题与表格都能被作用到 */}

            <div className="checkout-bar" style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
              <div className="checkout-summary" style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold', marginBottom: '20px', alignItems: 'center' }}>
                  <span>Subtotal ({getItemCount()} items)</span>
                  <div style={{ textAlign: 'right' }}>
                    {displayCurrency === cartCurrency ? (
                      <span style={{ color: 'var(--brand-green)' }}>{subtotalSymbol}{getCartTotal().toFixed(2)}</span>
                    ) : (
                      rates[displayCurrency] ? (
                        <span style={{ color: 'var(--brand-green)' }}>{displaySymbol}{getConvertedPrice(getCartTotal(), displayCurrency, rates, cartCurrency)?.toFixed(2)}</span>
                      ) : (
                        <span style={{ color: 'var(--brand-green)' }}>{subtotalSymbol}{getCartTotal().toFixed(2)}</span>
                      )
                    )}
                  </div>
                </div>
                <Link 
                  href="/checkout"
                  style={{ 
                    display: 'block',
                  width: '100%', 
                  backgroundColor: 'var(--brand-black)', 
                  color: 'white', 
                  padding: '15px', 
                  border: 'none', 
                  borderRadius: '3px', 
                  cursor: 'pointer', 
                  fontSize: '1em', 
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                    textDecoration: 'none',
                    textAlign: 'center',
                  transition: 'background-color 0.3s ease'
                  }}
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CartPage;