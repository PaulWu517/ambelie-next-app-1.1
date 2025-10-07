"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, Calendar, Clock } from 'lucide-react';
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
}

interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  provider: string;
  paymentDate: string;
  status: string;
}

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isMock = searchParams.get('mock') === '1';
  const { clearCart } = useCartStore();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMock) {
      clearCart();
      const now = new Date().toISOString();
      setOrderDetails({
        id: 'mock-1',
        orderNumber: 'TEMP-ORDER-1759817292957',
        totalAmount: 1.0,
        currency: 'GBP',
        customerEmail: 'guest@example.com',
        customerName: '华盛颐',
        orderDate: now,
        status: 'pending',
        items: [
          { name: 'payment-test', price: 1.0, quantity: 1, currency: 'GBP' },
        ],
      });
      setPaymentDetails({
        id: 'pay_mock_1',
        amount: 1.0,
        currency: 'GBP',
        paymentMethod: 'card',
        provider: 'stripe',
        paymentDate: now,
        status: 'succeeded',
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
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data && data.success && data.data) {
          clearCart();
          setOrderDetails(data.data);
          setPaymentDetails(prev => prev || null);
        } else {
          setError('Order data not found');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, isMock, clearCart]);

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

  return (
    <main className={styles.successPage}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <CheckCircle className={styles.titleIcon} />
          <h1 className={styles.pageTitle}>Payment Successful!</h1>
          <p className={styles.subtitle}>Thank you for your purchase. We have received your order.</p>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <h2 className={styles.errorTitle}>Payment Succeeded</h2>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {orderDetails && (
          <div className={styles.orderCard}>
            <div className={styles.orderHeader}>
              <div className={styles.orderTitle}>Order #{orderDetails.orderNumber}</div>
              <div className={styles.orderPlaced}><Clock className={styles.cardIcon} /> Order Placed</div>
            </div>
            <div className={styles.orderBody}>
              <div className={styles.orderMeta}>
                <Calendar className={styles.cardIcon} />
                <span>Order Date: {new Date(orderDetails.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className={styles.statusRow}>
                <div className={styles.statusLabel}>Order Status: {orderDetails.status}</div>
                <div className={styles.progressWrap}><div className={styles.progressBar} /></div>
              </div>

              {orderDetails.items && orderDetails.items.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div className={styles.itemsHeader}>
                    <h2 className={styles.itemsTitle}>Items in this order</h2>
                  </div>
                  <div className={styles.itemsBody}>
                    {orderDetails.items.map((item, idx) => (
                      <div key={idx} className={styles.itemRow}>
                        <Package className={styles.itemIcon} />
                        <div>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemQty}>Quantity: {item.quantity}</div>
                        </div>
                        <div className={styles.itemPrice}>
                          {currencySymbol(item.currency)}{item.price.toFixed(2)}
                          <div className={styles.perItem}>per item</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.summaryRow}>
                <div className={styles.customerInfo}>
                  <div>Customer: {orderDetails.customerName}</div>
                  <div>Email: {orderDetails.customerEmail}</div>
                </div>
                <div className={styles.orderTotalBox}>
                  <div className={styles.orderTotalLabel}>Order Total</div>
                  <div className={styles.orderTotalValue}>
                    {currencySymbol(orderDetails.currency)}{orderDetails.totalAmount.toFixed(2)} <span className={styles.currency}>{(orderDetails.currency || 'GBP').toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className={styles.actions}>
                <Link href="/" className={styles.tertiaryButton}>Back to Home</Link>
                <Link href="/products" className={styles.primaryButton}>Continue Shopping</Link>
              </div>
            </div>
          </div>
        )}

        <div className={styles.tipBox} style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Calendar style={{ width: '20px', height: '20px' }} />
            <div>
              <h4 className={styles.tipTitle}>Next Steps</h4>
              <p className={styles.tipText}>We will process your order within 1–2 business days and send tracking information via email.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}