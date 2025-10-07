import { Suspense } from 'react';
import OrderSuccessClient from './success.client';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <main className={require('./page.module.css').successPage}>
        <div className={require('./page.module.css').container}>
          <div className={require('./page.module.css').loadingContainer}>
            <div className={require('./page.module.css').spinner} />
            <p className={require('./page.module.css').loadingText}>Loading order details...</p>
          </div>
        </div>
      </main>
    }>
      <OrderSuccessClient />
    </Suspense>
  );
}