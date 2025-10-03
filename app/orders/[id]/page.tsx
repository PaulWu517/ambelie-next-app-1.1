'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Package, MapPin, CreditCard, ArrowLeft, Calendar, ShoppingBag, Phone, X, Edit, Ban } from 'lucide-react';
import OrderTimeline from '@/components/OrderTimeline';
import OrderCancelModal from '@/components/OrderCancelModal';
import OrderModifyModal from '@/components/OrderModifyModal';
import RefundRequestModal from '@/components/RefundRequestModal';
import { useOrderStatusStore, OrderStatus } from '@/lib/stores/orderStatusStore';
import styles from './page.module.css';

interface OrderItem {
  id: number;
  quantity: number;
  price?: number; // 可选，兼容旧数据
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

interface OrderDetails {
  id: string;
  orderNumber: string;
  totalAmount?: number; // 可选，防止undefined错误
  currency?: string; // 可选，有默认值
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  orderDate: string;
  status: string;
  shippingAddress?: any;
  billingAddress?: any;
  orderItems?: OrderItem[];
}

interface PaymentDetails {
  id: string;
  amount?: number; // 可选，防止undefined错误
  currency?: string; // 可选，有默认值
  paymentMethod: string;
  provider: string;
  paymentDate: string;
  status: string;
}

const OrderDetailsPage = () => {
  const currencySymbolMap: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$' };
  const params = useParams();
  const orderId = params.id;
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 模态框状态管理
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 按钮loading状态
  const [isModifyLoading, setIsModifyLoading] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [isRefundLoading, setIsRefundLoading] = useState(false);
  
  // 订单状态管理
  const { 
    getOrderStatus, 
    getStatusHistory, 
    initializeOrder, 
    updateOrderStatus,
    setTrackingInfo,
    setEstimatedDeliveryDate
  } = useOrderStatusStore();
  
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

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Invalid order identifier');
        setLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'https://ambelie-backend-production.up.railway.app';
        const token = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

        if (!token) {
          throw new Error('API token is not configured');
        }

        // 判断传入的参数是订单号还是ID
        // 如果包含字母或特殊字符，很可能是订单号；如果只是数字，可能是ID
        const isOrderNumber = /[A-Za-z\-]/.test(orderId as string);
        
        let orderResponse;
        
        if (isOrderNumber) {
          // 直接通过订单号查询
          orderResponse = await fetch(
            `${apiUrl}/api/orders/number/${encodeURIComponent(orderId as string)}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
        } else {
          // 通过ID查询
          orderResponse = await fetch(
          `${apiUrl}/api/orders/${orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        }
        
        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order information');
        }

        const orderData = await orderResponse.json();
        
        if (orderData.success && orderData.data) {
          const order = orderData.data;
          
          // 添加调试信息
          console.log('📊 Order details received:', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            orderItems: order.orderItems,
            sampleOrderItem: order.orderItems?.[0] || null
          });
          
          setOrderDetails({
            id: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            currency: order.currency,
            customerEmail: order.customerEmail,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            orderDate: order.orderDate,
            status: order.status,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            orderItems: order.orderItems,
          });

          // 如果有支付信息，设置支付详情
          if (order.payments && order.payments.length > 0) {
            const payment = order.payments[0];
            setPaymentDetails({
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              paymentMethod: payment.paymentMethod,
              provider: payment.provider,
              paymentDate: payment.paymentDate,
              status: payment.status,
            });
          }
          
          // 初始化订单状态跟踪
          const orderIdStr = order.id.toString();
          const existingStatus = getOrderStatus(orderIdStr);
          
          if (!existingStatus) {
            // 如果没有现有状态，初始化订单状态
            const mappedStatus = mapOrderStatusToEnum(order.status);
            initializeOrder(orderIdStr, mappedStatus);
            
            // 添加历史记录
            updateOrderStatus(orderIdStr, mappedStatus, `订单创建于 ${formatDate(order.orderDate)}`);
            
            // 如果有物流信息，设置物流跟踪
            if (order.trackingNumber) {
              setTrackingInfo(orderIdStr, order.trackingNumber, order.carrier);
            }
            
            // 如果有预计送达时间，设置预计送达时间
            if (order.estimatedDeliveryDate) {
              setEstimatedDeliveryDate(orderIdStr, new Date(order.estimatedDeliveryDate));
            }
          }
        } else {
          throw new Error('Order not found');
        }
      } catch (err) {
        console.error('Failed to fetch order details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch order details, please try again later');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // 处理订单取消
  const handleOrderCancel = async (reason: string, details?: string) => {
    if (!orderDetails) return;
    
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'https://ambelie-backend-production.up.railway.app';
      const token = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

      console.log('Cancelling order:', { orderId: orderDetails.id, reason, details });

      const response = await fetch(`${apiUrl}/api/orders/${orderDetails.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          details,
        }),
      });

      console.log('Cancel response status:', response.status);
      console.log('Cancel response ok:', response.ok);

      // 尝试解析响应内容
      const responseData = await response.json().catch(() => ({}));
      console.log('Cancel response data:', responseData);

      if (response.ok || response.status === 200) {
        // 更新订单状态
        setOrderDetails(prev => prev ? { ...prev, status: 'cancelled' } : null);
        
        // 更新订单状态管理
        updateOrderStatus(orderDetails.id.toString(), OrderStatus.CANCELLED, `Order cancelled: ${reason}`);
        
        alert('Order cancelled successfully. A refund will be processed within 3-5 business days.');
      } else {
        // 检查是否有具体的错误信息
        const errorMessage = responseData.message || responseData.error || 'Failed to cancel order';
        console.error('Cancel order failed:', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel order';
      alert(`Failed to cancel order. ${errorMessage}. Please try again or contact support.`);
      throw error; // 重新抛出错误，让模态框知道操作失败
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理订单修改
  const handleOrderModify = async (modifications: any) => {
    if (!orderDetails) return;
    
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'https://ambelie-backend-production.up.railway.app';
      const token = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

      console.log('Modifying order:', { orderId: orderDetails.id, modifications });

      const response = await fetch(`${apiUrl}/api/orders/${orderDetails.id}/modify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifications),
      });

      console.log('Modify response status:', response.status);
      console.log('Modify response ok:', response.ok);

      // 尝试解析响应内容
      const responseData = await response.json().catch(() => ({}));
      console.log('Modify response data:', responseData);

      if (response.ok || response.status === 200) {
        // 更新订单详情
        setOrderDetails(prev => prev ? { ...prev, ...modifications } : null);
        
        // 更新订单状态管理
        updateOrderStatus(orderDetails.id.toString(), mapOrderStatusToEnum(orderDetails.status), 'Order details updated');
        
        alert('Order updated successfully!');
      } else {
        // 检查是否有具体的错误信息
        const errorMessage = responseData.message || responseData.error || 'Failed to modify order';
        console.error('Modify order failed:', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Modify order error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order';
      alert(`Failed to update order. ${errorMessage}. Please try again or contact support.`);
      throw error; // 重新抛出错误，让模态框知道操作失败
    } finally {
      setIsProcessing(false);
    }
  };

  // 检查订单是否可以取消
  const canCancelOrder = (status: string) => {
    const nonCancellableStatuses = ['shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
    return !nonCancellableStatuses.includes(status.toLowerCase());
  };

  // 检查订单是否可以修改
  const canModifyOrder = (status: string) => {
    const nonModifiableStatuses = ['shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
    return !nonModifiableStatuses.includes(status.toLowerCase());
  };

  // 处理退款申请
  const handleRefundRequest = async (refundData: any) => {
    if (!orderDetails) return;
    
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'https://ambelie-backend-production.up.railway.app';
      const token = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

      console.log('Requesting refund:', { orderId: orderDetails.id, refundData });

      const response = await fetch(`${apiUrl}/api/orders/${orderDetails.id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      console.log('Refund response status:', response.status);
      console.log('Refund response ok:', response.ok);

      // 尝试解析响应内容
      const responseData = await response.json().catch(() => ({}));
      console.log('Refund response data:', responseData);

      if (response.ok || response.status === 200) {
        alert('Refund request submitted successfully. You will receive an email confirmation shortly.');
        
        // 更新订单状态管理
        updateOrderStatus(orderDetails.id.toString(), mapOrderStatusToEnum(orderDetails.status), 'Refund request submitted');
      } else {
        // 检查是否有具体的错误信息
        const errorMessage = responseData.message || responseData.error || 'Failed to submit refund request';
        console.error('Refund request failed:', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Refund request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit refund request';
      alert(`Failed to submit refund request. ${errorMessage}. Please try again or contact support.`);
      throw error; // 重新抛出错误，让模态框知道操作失败
    } finally {
      setIsProcessing(false);
    }
  };

  // 检查订单是否可以申请退款
  const canRequestRefund = (status: string) => {
    const refundableStatuses = ['delivered', 'completed'];
    return refundableStatuses.includes(status.toLowerCase());
  };

  const formatDate = (dateString: string) => {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return 'Invalid Date';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return 'No address provided';
    if (typeof address === 'string') return address;
    
    const parts = [];
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postal_code) parts.push(address.postal_code);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ') || 'Address information not available';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return styles.statusPaid;
      case 'pending':
        return styles.statusPending;
      case 'shipped':
        return styles.statusShipped;
      case 'delivered':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'paid':
        return 'Paid';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      default:
        return status;
    }
  };

  // 安全地获取订单项价格
  const getItemPrice = (item: OrderItem): number => {
    const price = item.unitPrice || item.price || item.product?.price || item.productSnapshot?.price || 0;
    
    // 调试信息
    if (price === 0) {
      console.warn('⚠️ Order item price is 0 or undefined:', {
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

  // 安全地获取订单项总价
  const getItemTotal = (item: OrderItem): number => {
    return item.totalPrice || (getItemPrice(item) * (item.quantity || 1));
  };

  // 安全地获取产品名称
  const getProductName = (item: OrderItem): string => {
    return item.productSnapshot?.name || item.product?.name || 'Product';
  };

  // 安全地获取订单总额
  const getOrderTotal = (order: OrderDetails): number => {
    return order.totalAmount || 0;
  };

  // 安全地获取支付金额
  const getPaymentAmount = (payment: PaymentDetails): number => {
    return payment.amount || 0;
  };

  if (loading) {
    return (
      <main className={styles.orderDetailsPage}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading order information...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.orderDetailsPage}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <div className={styles.errorBox}>
              <p className={styles.errorText}>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.orderDetailsPage}>
      <div className={styles.container}>
        {/* Back Button */}
        <Link href="/orders" className={styles.backButton}>
          <ArrowLeft className={styles.backIcon} />
            Back to Orders
          </Link>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Order Details</h1>
          {orderDetails && (
            <p className={styles.orderNumber}>Order Number: {orderDetails.orderNumber}</p>
          )}
        </div>

        {orderDetails && (
          <div className={styles.mainContent}>
            {/* Order Information Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <Package className={styles.cardIcon} />
                <h2 className={styles.cardTitle}>Order Information</h2>
              </div>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Order Number</span>
                  <span className={styles.infoValue}>{orderDetails.orderNumber}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Order Status</span>
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(orderDetails.status)}`}>
                    {getStatusText(orderDetails.status)}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Order Total</span>
                  <span className={styles.totalAmount}>
                    {currencySymbolMap[(orderDetails.currency || 'GBP').toUpperCase()] || '£'}
                    {getOrderTotal(orderDetails).toFixed(2) || '0.00'}
                    <span className={styles.currency}>{orderDetails.currency || 'GBP'}</span>
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Order Date</span>
                  <span className={styles.dateValue}>
                    <Calendar className={styles.dateIcon} />
                    {formatDate(orderDetails.orderDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <MapPin className={styles.cardIcon} />
                <h2 className={styles.cardTitle}>Customer Information</h2>
              </div>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Customer Name</span>
                  <span className={styles.infoValue}>{orderDetails.customerName}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{orderDetails.customerEmail}</span>
                </div>
                {orderDetails.customerPhone && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Phone</span>
                    <span className={styles.infoValue}>
                      <Phone className={styles.phoneIcon} />
                      {orderDetails.customerPhone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items Card */}
            {orderDetails.orderItems && Array.isArray(orderDetails.orderItems) && orderDetails.orderItems.length > 0 && (
              <div className={`${styles.card} ${styles.fullWidthCard}`}>
                <div className={styles.cardHeader}>
                  <ShoppingBag className={styles.cardIcon} />
                  <h2 className={styles.cardTitle}>Order Items</h2>
                </div>
                <div className={styles.itemsList}>
                  {orderDetails.orderItems.filter(item => item && item.id).map((item) => (
                    <div key={item.id} className={styles.orderItem}>
                      <div className={styles.itemLeft}>
                        <div className={styles.itemImage}>
                          <Package className={styles.itemImageIcon} />
                        </div>
                        <div className={styles.itemDetails}>
                          <p className={styles.itemName}>{getProductName(item)}</p>
                          <p className={styles.itemQuantity}>Quantity: {item.quantity || 1}</p>
                          <p className={styles.itemPrice}>Price per item: {(currencySymbolMap[(orderDetails.currency || 'GBP').toUpperCase()] || '£')}{getItemPrice(item).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className={styles.itemTotalPrice}>
                        <p className={styles.itemTotalAmount}>
                          {(currencySymbolMap[(orderDetails.currency || 'GBP').toUpperCase()] || '£')}{getItemTotal(item).toFixed(2)}
                        </p>
                        <p className={styles.itemTotalLabel}>Total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Address Card */}
            {orderDetails.shippingAddress && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <MapPin className={styles.cardIcon} />
                  <h2 className={styles.cardTitle}>Shipping Address</h2>
                </div>
                <div className={styles.addressCard}>
                  <p className={styles.addressText}>{formatAddress(orderDetails.shippingAddress)}</p>
                </div>
              </div>
            )}

            {/* Payment Information Card */}
            {paymentDetails && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <CreditCard className={styles.cardIcon} />
                  <h2 className={styles.cardTitle}>Payment Information</h2>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Payment Method</span>
                    <span className={styles.infoValue}>{paymentDetails.paymentMethod || 'Card'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Payment Status</span>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(paymentDetails.status)}`}>
                      {getStatusText(paymentDetails.status)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Payment Amount</span>
                    <span className={styles.totalAmount}>
                      {(currencySymbolMap[(paymentDetails.currency || orderDetails.currency || 'GBP').toUpperCase()] || '£')}
                      {getPaymentAmount(paymentDetails).toFixed(2) || '0.00'}
                      <span className={styles.currency}>{paymentDetails.currency || orderDetails.currency || 'GBP'}</span>
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Payment Date</span>
                    <span className={styles.dateValue}>
                      <Calendar className={styles.dateIcon} />
                      {formatDate(paymentDetails.paymentDate)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Order Actions Card */}
            <div className={`${styles.card} ${styles.fullWidthCard}`}>
              <div className={styles.cardHeader}>
                <Package className={styles.cardIcon} />
                <h2 className={styles.cardTitle}>Order Actions</h2>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
                  Manage your order with the available actions below.
                </p>
                
                <div className={styles.actionButtonsContainer}>
                  {canModifyOrder(orderDetails.status) && (
                    <button
                      onClick={() => {
                        setIsModifyLoading(true);
                        setTimeout(() => {
                          setIsModifyModalOpen(true);
                          setIsModifyLoading(false);
                        }, 300);
                      }}
                      disabled={isModifyLoading}
                      className={`${styles.actionButton} ${styles.modifyButton} ${isModifyLoading ? styles.loading : ''}`}
                    >
                      <Edit className={styles.actionButtonIcon} />
                      <span className={styles.actionButtonText}>
                        {isModifyLoading ? 'Opening...' : 'Modify Order'}
                      </span>
                    </button>
                  )}
                  
                  {canCancelOrder(orderDetails.status) && (
                    <button
                      onClick={() => {
                        setIsCancelLoading(true);
                        setTimeout(() => {
                          setIsCancelModalOpen(true);
                          setIsCancelLoading(false);
                        }, 300);
                      }}
                      disabled={isCancelLoading}
                      className={`${styles.actionButton} ${styles.cancelButton} ${isCancelLoading ? styles.loading : ''}`}
                    >
                      <Ban className={styles.actionButtonIcon} />
                      <span className={styles.actionButtonText}>
                        {isCancelLoading ? 'Opening...' : 'Cancel Order'}
                      </span>
                    </button>
                  )}
                  
                  {canRequestRefund(orderDetails.status) && (
                    <button
                      onClick={() => {
                        setIsRefundLoading(true);
                        setTimeout(() => {
                          setIsRefundModalOpen(true);
                          setIsRefundLoading(false);
                        }, 300);
                      }}
                      disabled={isRefundLoading}
                      className={`${styles.actionButton} ${styles.refundButton} ${isRefundLoading ? styles.loading : ''}`}
                    >
                      <span className={styles.actionButtonIcon} aria-hidden="true">
                        {currencySymbolMap[(orderDetails?.currency || paymentDetails?.currency || 'GBP').toUpperCase()] || '£'}
                      </span>
                      <span className={styles.actionButtonText}>
                        {isRefundLoading ? 'Opening...' : 'Request Refund'}
                      </span>
                    </button>
                  )}
                  
                  {!canCancelOrder(orderDetails.status) && !canModifyOrder(orderDetails.status) && !canRequestRefund(orderDetails.status) && (
                    <div 
                      className={`${styles.actionButton} ${styles.disabledButton}`}
                      data-tooltip="No actions available for this order status"
                    >
                      <X className={styles.actionButtonIcon} />
                      <span className={styles.actionButtonText}>No Actions Available</span>
                    </div>
                  )}
                </div>

                {/* 操作说明 */}
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Available Actions:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Modify Order:</strong> Update shipping address or contact information (before shipping)</li>
                    <li>• <strong>Cancel Order:</strong> Cancel your order and receive a full refund (before shipping)</li>
                    <li>• <strong>Request Refund:</strong> Apply for full or partial refund (after delivery)</li>
                    <li>• Contact customer support for assistance with any order-related issues</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Order Timeline Card */}
            <div className={`${styles.timelineCard} ${styles.fullWidthCard}`}>
              <OrderTimeline
                statusHistory={getStatusHistory(orderDetails.id.toString())}
                currentStatus={mapOrderStatusToEnum(orderDetails.status)}
                trackingNumber={getOrderStatus(orderDetails.id.toString())?.trackingNumber}
                carrier={getOrderStatus(orderDetails.id.toString())?.carrier}
                estimatedDeliveryDate={getOrderStatus(orderDetails.id.toString())?.estimatedDeliveryDate}
              />
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className={styles.helpSection}>
          <h4 className={styles.helpTitle}>Need Help?</h4>
          <p className={styles.helpDescription}>
            If you have any questions about this order or need to make changes, please contact our customer service team.
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



        {/* 模态框 */}
        {orderDetails && (
          <>
            <OrderCancelModal
              isOpen={isCancelModalOpen}
              onClose={() => setIsCancelModalOpen(false)}
              onConfirm={handleOrderCancel}
              orderNumber={orderDetails.orderNumber}
              orderAmount={getOrderTotal(orderDetails)}
              currency={orderDetails.currency || 'USD'}
              isLoading={isProcessing}
            />
            
            <OrderModifyModal
              isOpen={isModifyModalOpen}
              onClose={() => setIsModifyModalOpen(false)}
              onConfirm={handleOrderModify}
              orderNumber={orderDetails.orderNumber}
              currentData={{
                shippingAddress: orderDetails.shippingAddress,
                customerPhone: orderDetails.customerPhone,
                customerEmail: orderDetails.customerEmail,
                customerName: orderDetails.customerName,
              }}
              isLoading={isProcessing}
            />
            
            <RefundRequestModal
              isOpen={isRefundModalOpen}
              onClose={() => setIsRefundModalOpen(false)}
              onConfirm={handleRefundRequest}
              orderNumber={orderDetails.orderNumber}
              orderAmount={getOrderTotal(orderDetails)}
              currency={orderDetails.currency || 'USD'}
              orderItems={orderDetails.orderItems || []}
              isLoading={isProcessing}
            />
          </>
        )}
      </div>
    </main>
  );
};

export default OrderDetailsPage;