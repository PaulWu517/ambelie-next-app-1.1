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
        // 详细的环境变量调试信息
        console.log('=== 环境变量调试信息 ===');
        console.log('NEXT_PUBLIC_STRAPI_API_URL:', process.env.NEXT_PUBLIC_STRAPI_API_URL);
        console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
        console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('当前域名:', typeof window !== 'undefined' ? window.location.origin : 'SSR');
        
        // 使用正确的API URL，提供多个回退选项
        const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';
        
        console.log('=== API连接调试信息 ===');
        console.log('最终使用的API URL:', apiUrl);
        console.log('Session ID:', sessionId);
        console.log('完整的Session API URL:', `${apiUrl}/api/payments/session/${sessionId}`);
        
        // 网络连接测试
        console.log('=== 网络连接测试 ===');
        try {
          const healthCheck = await fetch(`${apiUrl}/api/health`, { 
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          console.log('健康检查响应状态:', healthCheck.status);
          if (healthCheck.ok) {
            const healthData = await healthCheck.text();
            console.log('健康检查响应:', healthData);
          }
        } catch (healthError) {
          console.warn('健康检查失败:', healthError);
        }
        
        // 首先获取支付会话详情
        console.log('=== 获取支付会话详情 ===');
        const sessionStartTime = Date.now();
        
        const sessionResponse = await fetch(
          `${apiUrl}/api/payments/session/${sessionId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
        
        const sessionEndTime = Date.now();
        console.log('Session API请求耗时:', sessionEndTime - sessionStartTime, 'ms');
        console.log('Session API响应状态:', sessionResponse.status);
        console.log('Session API响应头:', Object.fromEntries(sessionResponse.headers.entries()));
        
        if (!sessionResponse.ok) {
          const errorText = await sessionResponse.text();
          console.error('Session API错误响应:', {
            status: sessionResponse.status,
            statusText: sessionResponse.statusText,
            headers: Object.fromEntries(sessionResponse.headers.entries()),
            body: errorText
          });
          throw new Error(`无法获取支付会话详情: ${sessionResponse.status} - ${errorText}`);
        }

        const sessionData = await sessionResponse.json();
        console.log('Session数据完整响应:', JSON.stringify(sessionData, null, 2));
        console.log('Session数据结构:', {
          hasData: !!sessionData.data,
          dataKeys: sessionData.data ? Object.keys(sessionData.data) : [],
          amountTotal: sessionData.data?.amount_total,
          created: sessionData.data?.created,
          metadata: sessionData.data?.metadata
        });
        
        // 获取订单列表，查找对应的订单
        console.log('=== 获取订单列表 ===');
        const ordersStartTime = Date.now();
        const ordersUrl = `${apiUrl}/api/orders?populate=*&sort=createdAt:desc&pagination[limit]=10`;
        console.log('Orders API URL:', ordersUrl);
        
        const ordersResponse = await fetch(
          ordersUrl,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
        
        const ordersEndTime = Date.now();
        console.log('Orders API请求耗时:', ordersEndTime - ordersStartTime, 'ms');
        console.log('Orders API响应状态:', ordersResponse.status);
        console.log('Orders API响应头:', Object.fromEntries(ordersResponse.headers.entries()));
        
        if (!ordersResponse.ok) {
          const errorText = await ordersResponse.text();
          console.error('Orders API错误响应:', {
            status: ordersResponse.status,
            statusText: ordersResponse.statusText,
            headers: Object.fromEntries(ordersResponse.headers.entries()),
            body: errorText
          });
          throw new Error(`无法获取订单信息: ${ordersResponse.status} - ${errorText}`);
        }

        const ordersData = await ordersResponse.json();
        console.log('Orders数据完整响应:', JSON.stringify(ordersData, null, 2));
        console.log('Orders数据结构:', {
          hasData: !!ordersData.data,
          dataLength: ordersData.data?.length || 0,
          meta: ordersData.meta,
          firstOrderId: ordersData.data?.[0]?.id,
          firstOrderAttributes: ordersData.data?.[0]?.attributes ? Object.keys(ordersData.data[0].attributes) : []
        });
        
        // 查找与session ID匹配的订单
        console.log('=== 订单匹配逻辑 ===');
        console.log('开始订单匹配过程...');
        
        // 1. 首先尝试通过metadata中的订单ID匹配（如果有的话）
        // 2. 然后通过金额和时间范围匹配
        let order = null;
        
        if (!ordersData.data || !Array.isArray(ordersData.data)) {
          console.error('订单数据格式错误:', {
            hasData: !!ordersData.data,
            isArray: Array.isArray(ordersData.data),
            dataType: typeof ordersData.data,
            dataValue: ordersData.data
          });
        } else {
          console.log('订单数据验证通过，开始匹配...');
          
          // 获取session的创建时间
          const sessionCreatedAt = sessionData.data.created ? new Date(sessionData.data.created * 1000) : new Date();
          console.log('Session创建时间:', {
            timestamp: sessionData.data.created,
            date: sessionCreatedAt.toISOString(),
            isValid: !isNaN(sessionCreatedAt.getTime())
          });
          
          console.log('开始遍历', ordersData.data.length, '个订单进行匹配...');
          
          order = ordersData.data.find((order: any, index: number) => {
            console.log(`\n--- 检查订单 ${index + 1}/${ordersData.data.length} ---`);
            console.log('订单基本信息:', {
              id: order.id,
              orderNumber: order.attributes?.orderNumber,
              totalAmount: order.attributes?.totalAmount,
              createdAt: order.attributes?.createdAt,
              orderDate: order.attributes?.orderDate
            });
            
            const orderAmount = Math.round((order.attributes?.totalAmount || 0) * 100);
            const sessionAmount = sessionData.data.amount_total || 0;
            const orderCreatedAt = new Date(order.attributes?.createdAt || order.attributes?.orderDate || new Date());
            
            // 金额匹配（允许小的差异）
            const amountDiff = Math.abs(orderAmount - sessionAmount);
            const amountMatches = amountDiff < 10;
            
            // 时间匹配（订单创建时间应该在session创建时间的前后10分钟内）
            const timeDiff = Math.abs(orderCreatedAt.getTime() - sessionCreatedAt.getTime());
            const timeMatches = timeDiff < 10 * 60 * 1000; // 10分钟
            
            const matchResult = {
              orderId: order.id,
              orderAmount,
              sessionAmount,
              amountDiff,
              amountMatches,
              orderCreatedAt: orderCreatedAt.toISOString(),
              sessionCreatedAt: sessionCreatedAt.toISOString(),
              timeDiff,
              timeDiffMinutes: timeDiff / (60 * 1000),
              timeMatches,
              overallMatch: amountMatches && timeMatches
            };
            
            console.log('订单匹配检查结果:', matchResult);
            
            return amountMatches && timeMatches;
          });
        }
        
        console.log('\n=== 匹配结果 ===');
        console.log('找到的订单:', order ? {
          id: order.id,
          orderNumber: order.attributes?.orderNumber,
          totalAmount: order.attributes?.totalAmount
        } : null);

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
            `${apiUrl}/api/payments?filters[order][id][$eq]=${order.id}&populate=*`
          );
          
          console.log('Payments API响应状态:', paymentsResponse.status);
          
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
        } else {
          // 如果没有找到匹配的订单，提供更详细的错误信息
          console.warn('\n=== 未找到匹配订单 - 详细诊断 ===');
          
          const diagnosticInfo = {
            sessionInfo: {
              sessionId,
              amount: sessionData.data.amount_total,
              created: sessionData.data.created,
              createdDate: sessionData.data.created ? new Date(sessionData.data.created * 1000).toISOString() : 'N/A',
              metadata: sessionData.data.metadata
            },
            ordersInfo: {
              totalOrders: ordersData.data?.length || 0,
              ordersList: ordersData.data?.map((order: any) => ({
                id: order.id,
                orderNumber: order.attributes?.orderNumber,
                amount: order.attributes?.totalAmount,
                amountCents: Math.round((order.attributes?.totalAmount || 0) * 100),
                createdAt: order.attributes?.createdAt,
                orderDate: order.attributes?.orderDate
              })) || []
            },
            apiInfo: {
              apiUrl,
              environment: process.env.NODE_ENV,
              timestamp: new Date().toISOString()
            }
          };
          
          console.warn('完整诊断信息:', JSON.stringify(diagnosticInfo, null, 2));
          
          setError(`支付已完成，但暂时无法显示订单详情。\n\n调试信息：\n- 支付金额: ${sessionData.data.amount_total / 100}元\n- 可用订单数: ${ordersData.data?.length || 0}\n- Session ID: ${sessionId}\n\n请稍后访问订单页面查看，或联系客服并提供上述信息。`);
        }
      } catch (err) {
        console.error('\n=== 获取订单详情失败 - 错误详情 ===');
        console.error('错误对象:', err);
        console.error('错误堆栈:', err instanceof Error ? err.stack : 'N/A');
        console.error('错误类型:', typeof err);
        console.error('错误消息:', err instanceof Error ? err.message : String(err));
        
        const errorDiagnostic = {
          error: {
            message: err instanceof Error ? err.message : String(err),
            type: typeof err,
            name: err instanceof Error ? err.name : 'Unknown',
            stack: err instanceof Error ? err.stack : 'N/A'
          },
          context: {
            sessionId,
            apiUrl: process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app',
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
            url: typeof window !== 'undefined' ? window.location.href : 'N/A'
          }
        };
        
        console.error('完整错误诊断:', JSON.stringify(errorDiagnostic, null, 2));
        
        setError(`获取订单详情失败：${err instanceof Error ? err.message : '未知错误'}。\n\n技术详情：\n- 错误类型: ${err instanceof Error ? err.name : typeof err}\n- Session ID: ${sessionId}\n- 时间: ${new Date().toLocaleString()}\n\n请稍后重试或联系客服并提供上述信息。`);
      } finally {
        console.log('\n=== 支付成功页面处理完成 ===');
        console.log('最终状态:', {
          hasOrder: !!orderDetails,
          hasError: !!error,
          loading: false,
          timestamp: new Date().toISOString()
        });
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
              <div className="bg-yellow-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">支付成功</h2>
              <p className="text-red-800 mb-4">{error}</p>
              <div className="space-x-4">
                <Link 
                  href="/orders" 
                  className="inline-block bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  查看我的订单
                </Link>
                <Link 
                  href="/" 
                  className="inline-block bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  返回首页
                </Link>
              </div>
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
                      {(paymentDetails.currency || 'GBP').toUpperCase()} {({ usd: '$', gbp: '£', eur: '€', cny: '¥', jpy: '¥', hkd: 'HK$' })[((paymentDetails.currency || 'GBP') as string).toLowerCase()] || ''}{paymentDetails.amount.toFixed(2)}
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