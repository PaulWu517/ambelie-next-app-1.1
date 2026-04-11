'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Calendar, CreditCard, Eye, ShoppingBag, ArrowRight } from 'lucide-react';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { useOrderStatusStore, OrderStatus, ShippingCarrier } from '@/lib/stores/orderStatusStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// 更新 Order 接口以包含商品信息
interface OrderItem {
  id: number;
  quantity: number;
  price?: number; // 可选，因为可能不存在
  unitPrice?: number; // 后端实际字段
  totalPrice?: number; // 后端实际字段
  product?: {
    id: number;
    name: string;
    price: number;
    image?: string;
  };
  productSnapshot?: {
    id: string | number;
    name: string;
    price: number;
    description?: string;
    slug?: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  totalAmount?: number; // 可选，防止undefined错误
  currency?: string; // 可选，有默认值
  customerEmail: string;
  customerName: string;
  orderDate: string;
  createdAt?: string; // 添加创建时间字段
  status: string;
  orderItems?: OrderItem[];
}

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputEmail, setInputEmail] = useState<string>('');
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  
  // 用户认证状态
  const { user, isLoggedIn, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  // 订单状态管理
  const { initializeOrder, getOrderStatus, setTrackingInfo, setEstimatedDeliveryDate } = useOrderStatusStore();
  
  // 映射订单状态到枚举
  const mapOrderStatusToEnum = (status: string): OrderStatus => {
    switch (status.toLowerCase()) {
      case 'pending':
        return OrderStatus.PENDING;
      case 'confirmed':
        return OrderStatus.CONFIRMED;
      case 'paid':
        return OrderStatus.PAID;
      case 'processing':
        return OrderStatus.PROCESSING;
      case 'shipped':
        return OrderStatus.SHIPPED;
      case 'out_for_delivery':
        return OrderStatus.OUT_FOR_DELIVERY;
      case 'delivered':
        return OrderStatus.DELIVERED;
      case 'completed':
        return OrderStatus.COMPLETED;
      case 'cancelled':
        return OrderStatus.CANCELLED;
      case 'refunded':
        return OrderStatus.REFUNDED;
      default:
        return OrderStatus.PENDING;
    }
  };
  
  // 从 localStorage 加载 email 或使用已登录用户的邮箱
  useEffect(() => {
    if (isLoggedIn && user?.email) {
      // 如果用户已登录，优先使用用户邮箱
      setInputEmail(user.email);
      setSubmittedEmail(user.email);
    } else {
      // 否则从 localStorage 加载保存的邮箱
      const savedEmail = localStorage.getItem('userEmail') || localStorage.getItem('customerEmail');
      if (savedEmail) {
        setInputEmail(savedEmail);
        setSubmittedEmail(savedEmail);
      }
    }
  }, [isLoggedIn, user]);

  // 如果 Stripe 成功回跳到了 /orders（而不是 /order/success），在此根据查询参数做一次前端重定向
  // 支持形如 /orders?session_id=cs_...&redirect_status=success&email=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const sessionId = sp.get('session_id') || sp.get('sessionId') || '';
      const redirectStatus = (sp.get('redirect_status') || sp.get('status') || '').toLowerCase();
      // 优先取 URL 中的 email；否则尝试从本地存储获取
      const emailParam = sp.get('email') || '';
      const localEmail = emailParam || localStorage.getItem('customerEmail') || localStorage.getItem('userEmail') || '';

      const shouldRedirect = !!sessionId || redirectStatus === 'succeeded' || redirectStatus === 'success';
      if (shouldRedirect) {
        const to = `/order/success?session_id=${encodeURIComponent(sessionId)}${localEmail ? `&email=${encodeURIComponent(localEmail)}` : ''}`;
        router.replace(to);
      }
    } catch (e) {
      // 静默处理，避免影响订单页正常展示
    }
  }, [router]);

  // 通过用户token获取订单
  const fetchUserOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';
      
      // 获取用户token
      const tokenResponse = await fetch('/api/auth/get-token', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!tokenResponse.ok) {
        throw new Error('无法获取用户认证信息');
      }
      
      const tokenData = await tokenResponse.json();
      if (!tokenData.token) {
        throw new Error('用户认证信息无效');
      }

      const requestUrl = `${apiUrl}/api/website-users/me/orders`;
      console.log('Requesting User Orders from:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('User Orders API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('User Orders API Error Response:', errorText);
        throw new Error(`Failed to fetch user orders. Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('User Orders API Data Received:', result);

      if (result.success && Array.isArray(result.data)) {
        const sortedOrders = result.data.sort((a: Order, b: Order) => {
          const dateA = a.orderDate || a.createdAt || new Date().toISOString();
          const dateB = b.orderDate || b.createdAt || new Date().toISOString();
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        // 初始化订单状态管理
        sortedOrders.forEach((order: Order, index: number) => {
          const orderIdStr = order.id.toString();
          const existingStatus = getOrderStatus(orderIdStr);
          
          if (!existingStatus) {
            const mappedStatus = mapOrderStatusToEnum(order.status);
            initializeOrder(orderIdStr, mappedStatus);
          }
        });
        
        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }

    } catch (err) {
      console.error('Fetch User Orders function failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // 当 submittedEmail 改变时或用户登录状态改变时获取订单
  useEffect(() => {
    const fetchOrders = async () => {
      // 如果用户已登录，优先使用用户token获取订单
      if (isLoggedIn && user?.email) {
        await fetchUserOrders();
        return;
      }

      // 否则按邮箱获取订单
      if (!submittedEmail) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';
        const token = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

        if (!token) {
          throw new Error('API token is not configured');
        }

        const requestUrl = `${apiUrl}/api/orders/customer/${encodeURIComponent(submittedEmail)}`;
        console.log('Requesting Orders from:', requestUrl);

        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('API Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Failed to fetch orders. Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API Data Received:', result);

        // 后端返回的结构是 { success: true, data: [...] }
        if (result.success && Array.isArray(result.data)) {
          // 增加健壮性：过滤掉没有 orderDate 的记录，防止崩溃
          const validOrders = result.data.filter((order: any) => 
            order && order.orderDate
          );

          // 对有效订单按日期进行降序排序
          const sortedOrders = validOrders.sort((a: Order, b: Order) => 
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
          );
          
          // 添加调试信息
          console.log('📊 Orders data received:', {
            totalOrders: result.data.length,
            validOrders: validOrders.length,
            sampleOrder: sortedOrders[0] || null,
            sampleOrderItems: sortedOrders[0]?.orderItems || null
          });
          
          // 初始化订单状态管理
          sortedOrders.forEach((order: Order, index: number) => {
            const orderIdStr = order.id.toString();
            const existingStatus = getOrderStatus(orderIdStr);
            
            if (!existingStatus) {
              const mappedStatus = mapOrderStatusToEnum(order.status);
              initializeOrder(orderIdStr, mappedStatus);
              
              // 为演示目的，为部分订单添加示例追踪数据
              if (index === 0 && mappedStatus === OrderStatus.SHIPPED) {
                // 第一个订单如果是已发货状态，添加追踪号
                setTrackingInfo(orderIdStr, 'UPS123456789', ShippingCarrier.UPS);
                setEstimatedDeliveryDate(orderIdStr, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)); // 3天后
              } else if (index === 1 && mappedStatus === OrderStatus.DELIVERED) {
                // 第二个订单如果是已送达状态，添加完整追踪信息
                setTrackingInfo(orderIdStr, 'FDX987654321', ShippingCarrier.FEDEX);
                setEstimatedDeliveryDate(orderIdStr, new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)); // 1天前
              }
            }
          });
          
          setOrders(sortedOrders);
        } else {
          setOrders([]);
        }

      } catch (err) {
        console.error('Fetch Orders function failed:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [submittedEmail]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputEmail) {
      localStorage.setItem('customerEmail', inputEmail);
      setSubmittedEmail(inputEmail);
    }
  };

  const handleSwitchEmail = () => {
    setError(null);
    setSubmittedEmail('');
    setInputEmail('');
    setOrders([]);
    localStorage.removeItem('customerEmail');
  };
  
  const fetchOrdersAgain = () => {
     setSubmittedEmail(inputEmail);
  }

  const formatDate = (dateString: string) => {
    // 增加健壮性：检查日期字符串是否有效
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return 'Invalid Date';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 计算订单状态进度百分比
  const getStatusProgress = (status: OrderStatus): number => {
    const progressMap = {
      [OrderStatus.PENDING]: 10,
      [OrderStatus.CONFIRMED]: 20,
      [OrderStatus.PAID]: 30,
      [OrderStatus.PROCESSING]: 50,
      [OrderStatus.SHIPPED]: 70,
      [OrderStatus.OUT_FOR_DELIVERY]: 85,
      [OrderStatus.DELIVERED]: 95,
      [OrderStatus.COMPLETED]: 100,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.REFUNDED]: 0,
    };
    return progressMap[status] || 0;
  };

  // 安全地获取订单项价格
  const getItemPrice = (item: OrderItem): number => {
    const price = item.unitPrice || item.price || item.product?.price || item.productSnapshot?.price || 0;
    
    // 调试信息
    if (price === 0) {
      console.warn('⚠️ Item price is 0 or undefined:', {
        itemId: item.id,
        unitPrice: item.unitPrice,
        price: item.price,
        productPrice: item.product?.price,
        snapshotPrice: item.productSnapshot?.price,
        item: item
      });
    }
    
    return price;
  };

  // 安全地获取订单总额
  const getOrderTotal = (order: Order): number => {
    return order.totalAmount || 0;
  };

  // 安全地获取产品名称
  const getProductName = (item: OrderItem): string => {
    return item.productSnapshot?.name || item.product?.name || 'Product';
  };

  // 加载状态
  if (loading) {
    return (
      <main className={styles.ordersPage}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading orders...</p>
          </div>
        </div>
      </main>
    );
  }

  // 错误状态
  if (error) {
    return (
      <main className={styles.ordersPage}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <div className={styles.errorBox}>
              <p className={styles.errorText}>{error}</p>
              <div className={styles.errorButtons}>
                <button 
                  onClick={fetchOrdersAgain}
                  className={styles.retryButton}
                >
                  Retry
                </button>
                <button 
                  onClick={handleSwitchEmail}
                  className={styles.changeEmailButton}
                >
                  Change Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.ordersPage}>
      <div className={styles.container}>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          


          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1 className={styles.pageTitle}>
                <Package className={styles.titleIcon} />
                My Orders
              </h1>
              {submittedEmail ? (
                <div className={styles.emailInfo}>
                  <p className={styles.emailText}>Email: {submittedEmail}</p>
                  <button
                    onClick={handleSwitchEmail}
                    className={styles.switchButton}
                  >
                    Switch Email
                  </button>
                </div>
              ) : (
                <p className={styles.emailText}>View all your orders and their status</p>
              )}
            </div>
            <Link 
              href="/"
              className={styles.continueShoppingLink}
            >
              Continue Shopping
              <ArrowRight className={styles.buttonIcon} />
            </Link>
          </div>
        </div>

        {!submittedEmail ? (
          // Email Input Section
          <div className={styles.emailInputSection}>
            <div className={styles.emailInputContainer}>
              <Package className={styles.emailIcon} />
              <h3 className={styles.emailTitle}>View My Orders</h3>
              <p className={styles.emailSubtitle}>Please enter the email address you used when placing your order</p>
              <form onSubmit={handleEmailSubmit} className={styles.emailForm}>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className={styles.emailInput}
                  required
                />
                <button
                  type="submit"
                  disabled={!inputEmail}
                  className={styles.emailSubmitButton}
                >
                  View Orders
                </button>
              </form>
            </div>
            </div>
        ) : orders.length === 0 ? (
          // Empty State
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContainer}>
              <ShoppingBag className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No Orders Yet</h3>
              <p className={styles.emptySubtitle}>Email {submittedEmail} has not placed any orders yet</p>
              <p className={styles.emptyDescription}>Start shopping for products you love!</p>
              <div className={styles.emptyActions}>
              <Link 
                href="/products"
                  className={styles.startShoppingButton}
              >
                Start Shopping
              </Link>
              <button
                onClick={handleSwitchEmail}
                  className={styles.switchEmailButton}
              >
                Use a different email
              </button>
              </div>
            </div>
          </div>
        ) : (
          // Orders List
          <div className={styles.ordersGrid}>
            {orders.filter(order => order && order.id && order.orderNumber).map((order) => (
              <div key={order.id} className={styles.orderCard}>
                
                {/* Card Header: Order Number and Status */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderContent}>
                    <div className={styles.orderInfo}>
                      <h2 className={styles.orderNumber}>Order #{order.orderNumber}</h2>
                      <p className={styles.orderDate}>
                        <Calendar className={styles.dateIcon} />
                        Order Date: {formatDate(order.orderDate)}
                      </p>
                      {/* 显示订单追踪状态进度 */}
                      <div className={styles.orderProgress}>
                        <div className={styles.progressText}>
                          Order Status: {mapOrderStatusToEnum(order.status)}
                        </div>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ 
                              width: `${getStatusProgress(mapOrderStatusToEnum(order.status))}%` 
                            }}
                          />
                        </div>
                    </div>
                    </div>
                    <OrderStatusBadge 
                      status={mapOrderStatusToEnum(order.status)}
                      trackingNumber={getOrderStatus(order.id.toString())?.trackingNumber}
                      size="md"
                    />
                  </div>
                </div>
                
                {/* Items List */}
                {order.orderItems && Array.isArray(order.orderItems) && order.orderItems.length > 0 && (
                  <div className={styles.itemsSection}>
                    <h3 className={styles.itemsTitle}>Items in this order:</h3>
                    <div className={styles.itemsList}>
                      {order.orderItems.filter(item => item && item.id).map((item) => (
                        <div key={item.id} className={styles.orderItem}>
                          <div className={styles.itemLeft}>
                            <div className={styles.itemImage}>
                              <Package className={styles.itemImageIcon} />
                            </div>
                            <div className={styles.itemDetails}>
                              <p className={styles.itemName}>
                                {getProductName(item)}
                              </p>
                              <p className={styles.itemQuantity}>Quantity: {item.quantity || 1}</p>
                            </div>
                          </div>
                          <div className={styles.itemPrice}>
                            <p className={styles.itemPriceAmount}>
                              ${getItemPrice(item).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className={styles.itemPriceLabel}>per item</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Card Body: Customer Info and Total */}
                <div className={styles.cardBody}>
                  <div className={styles.cardBodyContent}>
                    <div className={styles.customerInfo}>
                      <p className={styles.customerName}>Customer: {order.customerName}</p>
                      <p className={styles.customerEmail}>Email: {order.customerEmail}</p>
                    </div>
                    
                    <div className={styles.orderTotal}>
                      <p className={styles.totalLabel}>Order Total</p>
                      <p className={styles.totalAmount}>
                        ${getOrderTotal(order).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className={styles.totalCurrency}>{order.currency || 'GBP'}</span>
                        </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className={styles.cardFooter}>
                  <div className={styles.footerContent}>
                    {/* 追踪信息预览 */}
                    <div className={styles.trackingPreview}>
                      <div className={styles.trackingInfo}>
                        {getOrderStatus(order.id.toString())?.trackingNumber && (
                          <div className={styles.trackingNumber}>
                            <Package className={styles.trackingIcon} />
                            <span>Tracking: {getOrderStatus(order.id.toString())?.trackingNumber}</span>
                          </div>
                        )}
                        {getOrderStatus(order.id.toString())?.estimatedDeliveryDate && (
                          <div className={styles.estimatedDelivery}>
                            <Calendar className={styles.trackingIcon} />
                            <span>Est. Delivery: {formatDate(getOrderStatus(order.id.toString())?.estimatedDeliveryDate?.toISOString() || '')}</span>
                          </div>
                        )}
                        {!getOrderStatus(order.id.toString())?.trackingNumber && !getOrderStatus(order.id.toString())?.estimatedDeliveryDate && (
                          <div className={styles.noTracking}>
                            <Package className={styles.trackingIcon} />
                            <span>Tracking information will be available once shipped</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Link 
                      href={`/orders/${order.orderNumber}`}
                      className={styles.viewDetailsButton}
                    >
                      View Full Tracking
                      <ArrowRight className={styles.buttonIcon} />
                    </Link>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Order Tracking Information */}
        <div className={styles.trackingInfoSection}>
          <h4 className={styles.trackingInfoTitle}>📦 Order Tracking Features</h4>
          <div className={styles.trackingFeatures}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🚚</div>
              <div className={styles.featureContent}>
                <h5>Real-time Status Updates</h5>
                <p>Track your order progress from confirmation to delivery with live status updates.</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📍</div>
              <div className={styles.featureContent}>
                <h5>Shipment Tracking</h5>
                <p>Get tracking numbers and estimated delivery dates for all shipped orders.</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🌍</div>
              <div className={styles.featureContent}>
                <h5>International Support</h5>
                <p>Full tracking support for international carriers including UPS, FedEx, DHL, and more.</p>
              </div>
            </div>
          </div>
          <div className={styles.trackingTip}>
            <strong>💡 Tip:</strong> Click "View Full Tracking" on any order to see the complete tracking timeline with detailed status history.
          </div>
        </div>

        {/* Help Information */}
        <div className={styles.helpSection}>
          <h4 className={styles.helpTitle}>Need Help?</h4>
          <p className={styles.helpDescription}>
            If you have any questions about your orders or need to make changes, please contact our customer service team.
          </p>
          <div className={styles.helpLinks}>
            <Link href="/contact" className={styles.helpLink}>
              Contact Support
            </Link>
            <Link href="/help" className={styles.helpLink}>
              Help Center
            </Link>
            <Link href="/returns" className={styles.helpLink}>
              Return Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OrdersPage;