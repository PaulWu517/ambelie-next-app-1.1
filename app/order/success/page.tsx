import { Suspense } from 'react';
import styles from './page.module.css';
import OrderSuccessClient from './success.client';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <main className={styles.successPage}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading order details...</p>
          </div>
        </div>
      </main>
    }>
      <OrderSuccessClient />
    </Suspense>
  );
}