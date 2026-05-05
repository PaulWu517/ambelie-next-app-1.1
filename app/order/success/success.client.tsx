"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useCartStore } from '@/lib/stores/cartStore';
import styles from './page.module.css';

interface OrderDetails {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  orderDate: string;
  status: string;
  items?: { name: string; price: number; quantity: number; currency: string }[];
  shippingOption?: string;
  customerPhone?: string;
  shippingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isMock = searchParams.get('mock') === '1';
  const { clearCart } = useCartStore();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMock) {
      clearCart();
      const now = new Date().toISOString();
      setOrderDetails({
        id: 'mock-1',
        orderNumber: 'TEMP-ORDER-1759817292957',
        totalAmount: 1,
        currency: 'GBP',
        customerEmail: 'guest@example.com',
        customerName: 'Customer',
        orderDate: now,
        status: 'paid',
        shippingOption: 'collect',
        items: [{ name: 'payment-test', price: 1, quantity: 1, currency: 'GBP' }],
      });
      setLoading(false);
      return;
    }

    if (!sessionId) {
      setError('Payment successful, but no session ID found.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const emailParam = searchParams.get('email');
        const url = `/api/orders/by-session?session_id=${encodeURIComponent(sessionId)}${emailParam ? `&email=${encodeURIComponent(emailParam)}` : ''}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
          const errText = await res.text();
          setError(`Failed to load order: ${res.status} ${errText || ''}`);
          return;
        }

        const data = await res.json();
        if (data?.success && data?.data) {
          clearCart();
          setOrderDetails(data.data);
        } else {
          setError('Order data not found');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, isMock, clearCart, searchParams]);

  const currencySymbol = (code: string) => ({
    USD: '$', GBP: '£', EUR: '€', CNY: '¥', JPY: '¥', HKD: 'HK$'
  })[(code || 'GBP').toUpperCase()] || '£';

  if (loading) {
    return (
      <main className={styles.successPage}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading order details...</p>
          </div>
        </div>
      </main>
    );
  }

  const shippingOption = orderDetails?.shippingOption === 'full_service' ? 'full_service' : 'collect';

  return (
    <main style={{ paddingTop: '160px', paddingBottom: '100px', minHeight: '100vh', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '50px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#666', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ fontWeight: 'bold', color: '#000' }}>
              <span style={{ display: 'inline-block', width: '24px', height: '24px', backgroundColor: '#000', color: '#fff', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', marginRight: '8px' }}>1</span>
              SHIPPING DETAILS
            </div>
            <div style={{ width: '40px', height: '1px', backgroundColor: '#ddd' }}></div>
            <div style={{ fontWeight: 'bold', color: '#000' }}>
              <span style={{ display: 'inline-block', width: '24px', height: '24px', backgroundColor: '#000', color: '#fff', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', marginRight: '8px' }}>2</span>
              REVIEW & PAY
            </div>
            <div style={{ width: '40px', height: '1px', backgroundColor: '#ddd' }}></div>
            <div style={{ fontWeight: 'bold', color: '#000' }}>
              <span style={{ display: 'inline-block', width: '24px', height: '24px', backgroundColor: '#000', color: '#fff', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', marginRight: '8px' }}>3</span>
              ORDER SUCCESS
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <h2 className={styles.errorTitle}>Payment Succeeded</h2>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {orderDetails && (
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
            <CheckCircle style={{ width: '54px', height: '54px', color: '#4b5563', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 500 }}>THANK YOU FOR YOUR ORDER</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Order #{orderDetails.orderNumber}</p>
            <p style={{ color: '#666', marginBottom: '40px' }}>
              A confirmation email has been sent to {orderDetails.customerEmail}.
            </p>

            <div style={{ backgroundColor: '#f9f9f9', padding: '30px', borderRadius: '8px', marginBottom: '30px', textAlign: 'left', border: '1px solid #eee' }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: '15px', fontWeight: 'bold' }}>WHAT HAPPENS NEXT</h2>

              {shippingOption === 'collect' ? (
                <>
                  <p style={{ marginBottom: '15px', lineHeight: '1.7', color: '#333' }}>
                    Our team is preparing your item(s). You will receive a separate email within 24-48 hours providing the pickup address, a unique reference number, and available time slots.
                  </p>
                  <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: '1.7' }}>
                    Please note: All logistics-related costs and arrangements beyond the point of collection are the customer&apos;s responsibility. Ensure you have your order confirmation and valid ID for a seamless handover.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '15px', lineHeight: '1.7', color: '#333' }}>
                    Thank you for requesting a delivery quote. Our logistics team is calculating a comprehensive shipping route tailored to your destination, including estimated taxes and duties.
                  </p>
                  <p style={{ marginBottom: '15px', lineHeight: '1.7', color: '#333' }}>
                    A formal quote will be sent to your email within 1-3 business days.
                  </p>
                  <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: '1.7' }}>
                    Please note: While we strive for accuracy, our quotes cover standard delivery and predictable taxes. Any destination-specific fees incurred locally remain the customer&apos;s responsibility.
                  </p>
                </>
              )}
            </div>

            {orderDetails.items && orderDetails.items.length > 0 && (
              <div style={{ backgroundColor: '#fff', padding: '24px 30px', borderRadius: '8px', marginBottom: '30px', textAlign: 'left', border: '1px solid #eee' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', fontWeight: 'bold' }}>ORDER SUMMARY</h3>
                {orderDetails.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', padding: '14px 0', borderBottom: idx === orderDetails.items!.length - 1 ? 'none' : '1px solid #eee' }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.name}</div>
                      <div style={{ color: '#666', fontSize: '0.95rem' }}>Quantity: {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 500 }}>
                      {currencySymbol(item.currency)}{(item.price * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #eee', fontSize: '1.05rem' }}>
                  <div style={{ color: '#333' }}>Order Total</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--brand-green)' }}>
                    {currencySymbol(orderDetails.currency)}{orderDetails.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/orders" style={{ padding: '12px 24px', backgroundColor: '#000', color: '#fff', border: 'none', textDecoration: 'none' }}>
                VIEW ORDER STATUS
              </Link>
              <Link href="/" style={{ padding: '12px 24px', backgroundColor: '#fff', color: '#000', border: '1px solid #000', textDecoration: 'none' }}>
                CONTINUE BROWSING
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
