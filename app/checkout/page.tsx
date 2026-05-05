'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useCartStore } from '@/lib/stores/cartStore';
import { useCurrencyStore, getConvertedPrice, currencySymbolMap as globalCurrencySymbolMap } from '@/lib/stores/currencyStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import getStripe from '@/lib/stripe';

const stripePromise = getStripe();

const CheckoutContent = () => {
  const searchParams = useSearchParams();
  const { items, getCartTotal, getItemCount, clearCart } = useCartStore();
  const { displayCurrency, rates } = useCurrencyStore();
  const displaySymbol = globalCurrencySymbolMap[displayCurrency] || displayCurrency;
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();
  const checkoutSuccess = searchParams.get('checkout_success') === '1' || !!searchParams.get('session_id');
  
  const [step, setStep] = useState(checkoutSuccess ? 3 : 1);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  
  const [shippingOption, setShippingOption] = useState<'collect' | 'full_service'>('collect');
  
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    name: '',
    phone: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  useEffect(() => {
    if (isLoggedIn && user) {
      setCustomerInfo(prev => ({
        ...prev,
        email: user.email || prev.email,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
      }));
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!checkoutSuccess) return;

    const sessionId = searchParams.get('session_id');
    const email = searchParams.get('email');
    if (!sessionId) {
      setStep(3);
      return;
    }

    const hydrateSuccessStep = async () => {
      try {
        const url = `/api/orders/by-session?session_id=${encodeURIComponent(sessionId)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) {
          setStep(3);
          return;
        }

        const data = await res.json();
        if (data?.success && data?.data) {
          const order = data.data;
          clearCart();
          setOrderNumber(order.orderNumber || '');
          setShippingOption(order.shippingOption === 'full_service' ? 'full_service' : 'collect');
          setCustomerInfo(prev => ({
            ...prev,
            email: order.customerEmail || prev.email,
            name: order.customerName || prev.name,
            phone: order.customerPhone || prev.phone,
            address: {
              line1: order.shippingAddress?.line1 || prev.address.line1,
              city: order.shippingAddress?.city || prev.address.city,
              state: order.shippingAddress?.state || prev.address.state,
              postal_code: order.shippingAddress?.postalCode || prev.address.postal_code,
              country: order.shippingAddress?.country || prev.address.country,
            },
          }));
        }
      } catch (error) {
        console.error('Failed to hydrate checkout success step:', error);
      } finally {
        setStep(3);
      }
    };

    hydrateSuccessStep();
  }, [checkoutSuccess, searchParams, clearCart]);

  useEffect(() => {
    if (items.length === 0 && step !== 3) {
      router.push('/cart');
    }
  }, [items.length, router, step]);

  if (items.length === 0 && step !== 3) {
    return null;
  }

  const subtotal: number = getCartTotal();
  const shipping: number = 0; 
  const cartCurrency = (items[0]?.currencyKeyword || 'GBP').toUpperCase();
  const currencySymbol = globalCurrencySymbolMap[cartCurrency] || '';
  const total: number = subtotal + shipping; 

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      // Auto load Stripe payment if they chose collect in store
      if (shippingOption === 'collect') {
        handleCreateCheckoutSession();
      }
    }
  };

  const handleCreateCheckoutSession = async () => {
    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: displayCurrency !== cartCurrency && rates[displayCurrency] ? getConvertedPrice(item.price || 0, displayCurrency, rates, cartCurrency) : (item.price || 0),
        productName: item.name
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';
      
      try {
        const tokenResponse = await fetch('/api/auth/get-token', {
          method: 'GET',
          credentials: 'include',
        });
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.success && tokenData.token) {
            headers.Authorization = `Bearer ${tokenData.token}`;
          }
        }
      } catch (tokenError) {
        console.log('Token error:', tokenError);
      }

      const paymentUrl = `${apiUrl}/api/payments/create-checkout-session`;
      const paymentPayload = {
        orderItems,
        currency: displayCurrency,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?checkout_success=1`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
        metadata: {
          customerPhone: customerInfo.phone,
          shippingOption,
          addressLine1: customerInfo.address.line1,
          addressCity: customerInfo.address.city,
          addressState: customerInfo.address.state,
          addressPostalCode: customerInfo.address.postal_code,
          addressCountry: customerInfo.address.country,
          items: JSON.stringify(orderItems)
        }
      };
      
      const response = await fetch(paymentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentPayload),
      });
      
      const responseData = await response.json();
      const { success, data } = responseData;

      if (success && data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else if (success && data.url) {
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
        }
      } else {
        throw new Error('Failed to create payment session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment initialization failed, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestQuote = async () => {
    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: displayCurrency !== cartCurrency && rates[displayCurrency] ? getConvertedPrice(item.price || 0, displayCurrency, rates, cartCurrency) : (item.price || 0),
        productName: item.name
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';
      
      try {
        const tokenResponse = await fetch('/api/auth/get-token', { method: 'GET', credentials: 'include' });
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.success && tokenData.token) {
            headers.Authorization = `Bearer ${tokenData.token}`;
          }
        }
      } catch (tokenError) {
        console.log('Token error:', tokenError);
      }

      // Call the custom backend endpoint for creating a quote order
      const quoteUrl = `${apiUrl}/api/orders/request-quote`;
      const quotePayload = {
        orderItems,
        currency: displayCurrency,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        shippingAddress: customerInfo.address,
        shippingOption
      };
      
      const response = await fetch(quoteUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(quotePayload),
      });
      
      const responseData = await response.json();
      
      if (responseData.success) {
        setOrderNumber(responseData.data.orderNumber);
        clearCart();
        setStep(3);
      } else {
        throw new Error('Failed to submit quote request');
      }
    } catch (error) {
      console.error('Quote request error:', error);
      alert('Failed to submit quote request, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page-root" style={{ paddingTop: '160px', paddingBottom: '100px' }}>
      <div className="section-container">
        
        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '50px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#666' }}>
            <div style={{ fontWeight: step >= 1 ? 'bold' : 'normal', color: step >= 1 ? '#000' : '#aaa' }}>
              <span style={{ display: 'inline-block', width: '24px', height: '24px', backgroundColor: step >= 1 ? '#000' : '#eee', color: step >= 1 ? '#fff' : '#aaa', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', marginRight: '8px' }}>1</span>
              SHIPPING DETAILS
            </div>
            <div style={{ width: '40px', height: '1px', backgroundColor: '#ddd' }}></div>
            <div style={{ fontWeight: step >= 2 ? 'bold' : 'normal', color: step >= 2 ? '#000' : '#aaa' }}>
              <span style={{ display: 'inline-block', width: '24px', height: '24px', backgroundColor: step >= 2 ? '#000' : '#eee', color: step >= 2 ? '#fff' : '#aaa', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', marginRight: '8px' }}>2</span>
              REVIEW & PAY
            </div>
            <div style={{ width: '40px', height: '1px', backgroundColor: '#ddd' }}></div>
            <div style={{ fontWeight: step === 3 ? 'bold' : 'normal', color: step === 3 ? '#000' : '#aaa' }}>
              <span style={{ display: 'inline-block', width: '24px', height: '24px', backgroundColor: step === 3 ? '#000' : '#eee', color: step === 3 ? '#fff' : '#aaa', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', marginRight: '8px' }}>3</span>
              ORDER SUCCESS
            </div>
          </div>
        </div>

        {step === 3 ? (
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>THANK YOU FOR YOUR ORDER</h1>
            {orderNumber && <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Order #{orderNumber}</p>}
            <p style={{ color: '#666', marginBottom: '40px' }}>A confirmation email has been sent to [{customerInfo.email}].</p>
            
            <div style={{ backgroundColor: '#f9f9f9', padding: '30px', borderRadius: '8px', marginBottom: '40px', textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: 'bold' }}>WHAT HAPPENS NEXT</h2>
              
              {shippingOption === 'collect' ? (
                <>
                  <p style={{ marginBottom: '15px', lineHeight: '1.6' }}>
                    Our team is preparing your item(s). You will receive a separate email within 24-48 hours providing the pickup address, a unique reference number, and available time slots.
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                    <strong>Please note:</strong> All logistics-related costs and arrangements beyond the point of collection are the customer's responsibility. Ensure you have your order confirmation and valid ID for a seamless handover.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '15px', lineHeight: '1.6' }}>
                    Thank you for requesting a delivery quote. Our logistics team is calculating a comprehensive shipping route tailored to your destination, including estimated taxes and duties. A formal quote will be sent to your email within 1-3 business days.
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                    <strong>Please note:</strong> While we strive for accuracy, our quotes cover standard delivery and predictable taxes. Any destination-specific fees incurred locally (such as demurrage or storage fees due to customs delays) remain the customer’s responsibility.
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={() => router.push('/orders')} style={{ padding: '12px 24px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>
                VIEW ORDER STATUS
              </button>
              <button onClick={() => router.push('/')} style={{ padding: '12px 24px', backgroundColor: '#fff', color: '#000', border: '1px solid #000', cursor: 'pointer' }}>
                CONTINUE BROWSING
              </button>
            </div>
          </div>
        ) : (
          <div className="checkout-grid">
            {/* 左侧：表单区 */}
            <div>
              {step === 1 && (
                <form onSubmit={handleNextStep}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '500' }}>
                    SHIPPING AND BILLING ADDRESS
                  </h2>
                  
                  <div style={{ display: 'grid', gap: '20px', marginBottom: '40px' }}>
                    <input type="email" placeholder="Email Address *" value={customerInfo.email} onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})} className="form-input" required />
                    <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <input type="text" placeholder="Full Name *" value={customerInfo.name} onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})} className="form-input" required />
                      <input type="tel" placeholder="Phone Number *" value={customerInfo.phone} onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} className="form-input" required />
                    </div>
                    <select value={customerInfo.address.country} onChange={(e) => setCustomerInfo({...customerInfo, address: {...customerInfo.address, country: e.target.value}})} className="form-input" required>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CN">China</option>
                      <option value="AU">Australia</option>
                      <option value="CA">Canada</option>
                      <option value="JP">Japan</option>
                      <option value="FR">France</option>
                    </select>
                    <input type="text" placeholder="Address Line 1 *" value={customerInfo.address.line1} onChange={(e) => setCustomerInfo({...customerInfo, address: {...customerInfo.address, line1: e.target.value}})} className="form-input" required />
                    <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <input type="text" placeholder="City *" value={customerInfo.address.city} onChange={(e) => setCustomerInfo({...customerInfo, address: {...customerInfo.address, city: e.target.value}})} className="form-input" required />
                      <input type="text" placeholder="State / Province *" value={customerInfo.address.state} onChange={(e) => setCustomerInfo({...customerInfo, address: {...customerInfo.address, state: e.target.value}})} className="form-input" required />
                    </div>
                    <input type="text" placeholder="Zip / Postal Code *" value={customerInfo.address.postal_code} onChange={(e) => setCustomerInfo({...customerInfo, address: {...customerInfo.address, postal_code: e.target.value}})} className="form-input" required />
                  </div>

                  <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', fontWeight: '500' }}>
                    SHIPPING OPTIONS
                  </h2>
                  <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                    <label style={{ display: 'block', marginBottom: '20px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <input type="radio" name="shippingOption" value="collect" checked={shippingOption === 'collect'} onChange={() => setShippingOption('collect')} style={{ marginTop: '4px', marginRight: '15px' }} />
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '5px' }}>Collect in store</div>
                          <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.4' }}>
                            This item price excludes delivery. All shipping arrangements, applicable taxes, and import duties are the customer's responsibility and are not charged at checkout. By purchasing, you agree to cover all subsequent logistics costs and charges incurred for pickup.
                          </div>
                        </div>
                      </div>
                    </label>

                    <label style={{ display: 'block', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <input type="radio" name="shippingOption" value="full_service" checked={shippingOption === 'full_service'} onChange={() => setShippingOption('full_service')} style={{ marginTop: '4px', marginRight: '15px' }} />
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '5px' }}>Full-Service Shipping Quote</div>
                          <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.4' }}>
                            We provide a comprehensive door-to-door logistics service. After placing your order, our team will calculate an all-inclusive quote—including the item price, shipping fees, and all applicable taxes/duties. This formal quote will be sent to your email for review. No shipping or tax charges will be applied at checkout; the final total will be billed separately upon your approval.
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>

                  <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                    CONTINUE TO REVIEW
                  </button>
                </form>
              )}

              {step === 2 && (
                <div>
                  {/* Left side in Step 2: Now empty or simplified, moving content to right side */}
                  {shippingOption === 'collect' && clientSecret && (
                    <div>
                      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                        <EmbeddedCheckout />
                      </EmbeddedCheckoutProvider>
                    </div>
                  )}
                  
                  {shippingOption === 'collect' && !clientSecret && (
                    <div>
                      <button
                        onClick={handleCreateCheckoutSession}
                        disabled={loading}
                        style={{
                          width: '100%', marginTop: '20px', backgroundColor: loading ? '#ccc' : '#000', color: 'white',
                          padding: '15px', border: 'none', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {loading ? 'Loading Payment...' : 'CONTINUE TO PAYMENT'}
                      </button>
                    </div>
                  )}
                  
                  {shippingOption === 'full_service' && (
                    <div>
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '30px', fontWeight: '500' }}>
                        SUBMIT REQUEST
                      </h2>
                      <button
                        onClick={handleRequestQuote}
                        disabled={loading}
                        style={{
                          width: '100%', marginTop: '20px', backgroundColor: loading ? '#ccc' : '#000', color: 'white',
                          padding: '15px', border: 'none', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {loading ? 'Processing...' : 'REQUEST FORMAL QUOTE'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：订单摘要及核对信息 */}
            <div className="right-column-container">
              <div className="summary-card" style={{ border: '1px solid #ddd', padding: '30px', backgroundColor: '#f9f9f9', marginBottom: step === 2 ? '20px' : '0' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: '500' }}>ORDER SUMMARY</h3>
                <div style={{ marginBottom: '20px' }}>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '500', marginBottom: '5px' }}>{item.name}</p>
                        <p style={{ fontSize: '0.9rem', color: '#666' }}>Qty: {item.quantity} × {currencySymbol}{(item.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
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
                    <span>Shipping & Taxes</span>
                    <div style={{ textAlign: 'right' }}>
                      {shippingOption === 'collect' ? 'Customer responsibility' : 'Calculated after quote'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
                    <span>Total Due Now</span>
                    <div style={{ textAlign: 'right' }}>
                      {shippingOption === 'full_service' ? (
                        <div style={{ color: 'var(--brand-green)' }}>{currencySymbol}0</div>
                      ) : (
                        displayCurrency === cartCurrency ? (
                          <div style={{ color: 'var(--brand-green)' }}>{currencySymbol}{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        ) : (
                          rates[displayCurrency] ? (
                            <div style={{ color: 'var(--brand-green)' }}>{displaySymbol}{getConvertedPrice(total, displayCurrency, rates, cartCurrency)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          ) : (
                            <div style={{ color: 'var(--brand-green)' }}>{currencySymbol}{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          )
                        )
                      )}
                    </div>
                  </div>
                  {/* Remove button from summary since it is now in main flow */}
                </div>
              </div>
              
              {/* Review Information moved to right side under order summary in Step 2 */}
              {step === 2 && (
                 <div style={{ marginTop: '20px' }}>
                   <div style={{ border: '1px solid #eee', padding: '20px', marginBottom: '20px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                       <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>SHIP TO:</h3>
                        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '0.9rem', textDecoration: 'underline' }}>Edit</button>
                      </div>
                     <p style={{ color: '#333', marginBottom: '5px' }}>{customerInfo.name}</p>
                     <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.5' }}>
                       {customerInfo.address.line1}<br />
                       {customerInfo.address.city}, {customerInfo.address.state} {customerInfo.address.postal_code}<br />
                       {customerInfo.address.country}<br />
                       {customerInfo.phone}
                     </p>
                   </div>
 
                   <div style={{ border: '1px solid #eee', padding: '20px', marginBottom: '30px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                       <h3 style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>SHIPPING METHOD:</h3>
                        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '0.9rem', textDecoration: 'underline' }}>Edit</button>
                      </div>
                     <p style={{ color: '#333', fontSize: '0.9rem' }}>
                       {shippingOption === 'collect' ? 'Collect in store' : 'Full-Service Shipping Quote'}
                     </p>
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}
        <style jsx>{`
          .checkout-page-root { overflow-x: hidden; }
          .section-container { box-sizing: border-box; max-width: 1200px; margin: 0 auto; padding: 0 20px; width: 100%; }
          .checkout-grid { display: grid; grid-template-columns: 1fr 450px; gap: 60px; width: 100%; align-items: start; }
          .right-column-container { width: 100%; max-width: 100%; box-sizing: border-box; position: sticky; top: 120px; }
          .summary-card { width: 100%; box-sizing: border-box; }
          .form-input { width: 100%; padding: 12px; border: 1px solid #ddd; font-size: 1rem; box-sizing: border-box; }
          @media (max-width: 1024px) {
            .section-container { padding: 0 16px !important; }
            .checkout-grid { grid-template-columns: 1fr; gap: 32px; }
            .two-col-grid { grid-template-columns: 1fr !important; gap: 20px; }
            .right-column-container { position: static; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ paddingTop: '160px', textAlign: 'center' }}>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
