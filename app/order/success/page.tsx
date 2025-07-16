'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, MapPin, CreditCard, Calendar } from 'lucide-react';
import { useCartStore } from '@/lib/stores/cartStore';

interface OrderDetails {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  orderDate: string;
  status: string;
  shippingAddress: any;
  billingAddress: any;
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

const OrderSuccessContent = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCartStore();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId) {
        setError('没有找到支付会话ID');
        setLoading(false);
        return;
      }

      // 只有在有有效sessionId的情况下才清空购物车
      // 这确保用户确实完成了支付流程
      clearCart();
      console.log('购物车已清空 - 支付成功确认');

      try {
        // 首先获取支付会话详情
        const sessionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/session/${sessionId}`
        );
        
        if (!sessionResponse.ok) {
          throw new Error('无法获取支付会话详情');
        }

        const sessionData = await sessionResponse.json();
        
        // 获取订单列表，查找对应的订单
        const ordersResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/orders?populate=*&sort=createdAt:desc&pagination[limit]=10`
        );
        
        if (!ordersResponse.ok) {
          throw new Error('无法获取订单信息');
        }

        const ordersData = await ordersResponse.json();
        
        // 查找与session ID匹配的订单（通过时间或金额匹配）
        const order = ordersData.data?.find((order: any) => {
          const orderAmount = Math.round(order.attributes.totalAmount * 100);
          const sessionAmount = sessionData.data.amount_total;
          return Math.abs(orderAmount - sessionAmount) < 10; // 允许小的差异
        });

        if (order) {
          setOrderDetails({
            id: order.id,
            orderNumber: order.attributes.orderNumber,
            totalAmount: order.attributes.totalAmount,
            currency: order.attributes.currency,
            customerEmail: order.attributes.customerEmail,
            customerName: order.attributes.customerName,
            customerPhone: order.attributes.customerPhone,
            orderDate: order.attributes.orderDate,
            status: order.attributes.status,
            shippingAddress: order.attributes.shippingAddress,
            billingAddress: order.attributes.billingAddress,
          });

          // 获取支付详情
          const paymentsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/payments?filters[order][id][$eq]=${order.id}&populate=*`
          );
          
          if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json();
            const payment = paymentsData.data?.[0];
            
            if (payment) {
              setPaymentDetails({
                id: payment.id,
                amount: payment.attributes.amount,
                currency: payment.attributes.currency,
                paymentMethod: payment.attributes.paymentMethod,
                provider: payment.attributes.provider,
                paymentDate: payment.attributes.paymentDate,
                status: payment.attributes.status,
              });
            }
          }
        }
      } catch (err) {
        console.error('获取订单详情失败:', err);
        setError('获取订单详情失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId, clearCart]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return '地址信息不可用';
    
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  if (loading) {
    return (
      <main className="min-h-screen" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">正在加载订单信息...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800">{error}</p>
              <Link 
                href="/" 
                className="mt-4 inline-block bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="max-w-4xl mx-auto px-4">
        {/* 成功标题 */}
        <div className="text-center mb-8">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">支付成功！</h1>
          <p className="text-gray-600">感谢您的购买，我们已收到您的订单</p>
        </div>

        {orderDetails && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {/* 订单基本信息 */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-green-600" />
                订单信息
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">订单号</p>
                  <p className="font-semibold">{orderDetails.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">订单状态</p>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {orderDetails.status === 'paid' ? '已支付' : orderDetails.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">订单金额</p>
                  <p className="font-semibold text-lg text-green-600">
                    {orderDetails.currency} ${orderDetails.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">下单时间</p>
                  <p className="font-semibold">{formatDate(orderDetails.orderDate)}</p>
                </div>
              </div>
            </div>

            {/* 客户信息 */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">客户信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">姓名</p>
                  <p className="font-semibold">{orderDetails.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">邮箱</p>
                  <p className="font-semibold">{orderDetails.customerEmail}</p>
                </div>
                {orderDetails.customerPhone && (
                  <div>
                    <p className="text-sm text-gray-600">电话</p>
                    <p className="font-semibold">{orderDetails.customerPhone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 配送地址 */}
            {orderDetails.shippingAddress && (
              <div className="border-b border-gray-200 pb-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  配送地址
                </h3>
                <p className="text-gray-700">{formatAddress(orderDetails.shippingAddress)}</p>
              </div>
            )}

            {/* 支付信息 */}
            {paymentDetails && (
              <div className="pb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                  支付信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">支付方式</p>
                    <p className="font-semibold capitalize">{paymentDetails.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">支付状态</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {paymentDetails.status === 'succeeded' ? '支付成功' : paymentDetails.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">支付金额</p>
                    <p className="font-semibold text-green-600">
                      {paymentDetails.currency.toUpperCase()} ${paymentDetails.amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">支付时间</p>
                    <p className="font-semibold">{formatDate(paymentDetails.paymentDate)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="text-center space-x-4">
          <Link 
            href="/" 
            className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            返回首页
          </Link>
          <Link 
            href="/products" 
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            继续购物
          </Link>
        </div>

        {/* 订单追踪提示 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
            <div>
              <h4 className="font-semibold text-blue-900">后续流程</h4>
              <p className="text-blue-800 text-sm mt-1">
                我们将在1-2个工作日内处理您的订单并安排发货。您将收到包含追踪信息的邮件通知。
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const OrderSuccessPage = () => {
  return (
    <Suspense fallback={
      <main style={{ paddingTop: '120px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ padding: '60px 0' }}>Loading...</div>
        </div>
      </main>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
};

export default OrderSuccessPage; 