'use client';

import React from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/stores/cartStore';
import Image from 'next/image';

const CartPage = () => {
  const { items, removeFromCart, updateQuantity, getCartTotal, getItemCount } = useCartStore();

  return (
    <main className="cart-page" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="section-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 50px' }}>
                <h1 className="section-heading" style={{ marginBottom: '40px', textAlign: 'left' }}>Shopping Cart</h1>
        
        {items.length === 0 ? (
          <div className="text-center">
            <p style={{ fontSize: '1.2em', marginBottom: '20px', color: '#666' }}>Your cart is empty</p>
            <Link href="/products" style={{ color: 'var(--brand-green)', textDecoration: 'underline' }}>
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {/* 表格标题 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', 
              gap: '20px', 
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
            {items.map((item) => (
              <div key={item.id} style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', 
                gap: '20px', 
                alignItems: 'center', 
                borderBottom: '1px solid #eee', 
                paddingTop: '20px', 
                paddingBottom: '20px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '100px', 
                    marginRight: '15px', 
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    <Image
                      src={item.main_image?.data?.attributes?.url ? 
                        (item.main_image.data.attributes.url.startsWith('http') ? 
                          item.main_image.data.attributes.url : 
                          `https://ambelie-backend-production.up.railway.app${item.main_image.data.attributes.url}`
                        ) : '/placeholder.jpg'
                      }
                      alt={item.name}
                      width={80}
                      height={100}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.jpg';
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
                  fontWeight: '500'
                }}>${item.price?.toFixed(2) || '0.00'}</div>
                <div>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10))}
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
                  fontSize: '1em'
                }}>${((item.price || 0) * item.quantity).toFixed(2)}</div>
                <div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{ 
                      color: '#dc3545', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontSize: '0.9em',
                      padding: '5px',
                      borderRadius: '3px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* 移动端布局 */}
            <style jsx>{`
              @media (max-width: 768px) {
                .cart-grid {
                  display: block !important;
                }
                .cart-header {
                  display: none !important;
                }
                .cart-item {
                  display: block !important;
                  padding: 15px 0 !important;
                  border-bottom: 1px solid #eee !important;
                }
                .cart-item > div {
                  margin-bottom: 10px;
                }
                .product-info {
                  display: flex !important;
                  align-items: center !important;
                  margin-bottom: 15px !important;
                }
                .price-quantity-row {
                  display: flex !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  margin-bottom: 10px !important;
                }
              }
            `}</style>

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold', marginBottom: '20px' }}>
                  <span>Subtotal ({getItemCount()} items)</span>
                  <span style={{ color: 'var(--brand-green)' }}>${getCartTotal().toFixed(2)}</span>
                </div>
                <button style={{ 
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
                  transition: 'background-color 0.3s ease'
                }}>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CartPage; 