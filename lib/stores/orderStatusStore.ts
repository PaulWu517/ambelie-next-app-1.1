import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 订单状态枚举 - 符合国际电商标准
export enum OrderStatus {
  PENDING = 'pending',           // 待处理
  CONFIRMED = 'confirmed',       // 已确认
  PAID = 'paid',                 // 已支付
  PROCESSING = 'processing',     // 处理中
  SHIPPED = 'shipped',           // 已发货
  OUT_FOR_DELIVERY = 'out_for_delivery', // 配送中
  DELIVERED = 'delivered',       // 已送达
  COMPLETED = 'completed',       // 已完成
  CANCELLED = 'cancelled',       // 已取消
  REFUNDED = 'refunded'          // 已退款
}

// 状态历史记录接口
export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
  location?: string;
  trackingNumber?: string;
}

// 国际物流承运商
export enum ShippingCarrier {
  UPS = 'ups',
  FEDEX = 'fedex',
  DHL = 'dhl',
  USPS = 'usps',
  TNT = 'tnt',
  DPEX = 'dpex',
  ARAMEX = 'aramex',
  SF_EXPRESS = 'sf_express',
  CHINA_POST = 'china_post',
  OTHER = 'other'
}

// 承运商配置
export const CarrierConfig = {
  [ShippingCarrier.UPS]: {
    name: 'UPS',
    trackingUrlTemplate: 'https://www.ups.com/track?tracknum={trackingNumber}',
    estimatedDays: { min: 1, max: 5 },
    regions: ['US', 'EU', 'WORLDWIDE']
  },
  [ShippingCarrier.FEDEX]: {
    name: 'FedEx',
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?tracknum={trackingNumber}',
    estimatedDays: { min: 1, max: 5 },
    regions: ['US', 'EU', 'WORLDWIDE']
  },
  [ShippingCarrier.DHL]: {
    name: 'DHL',
    trackingUrlTemplate: 'https://www.dhl.com/track?trackingNumber={trackingNumber}',
    estimatedDays: { min: 2, max: 7 },
    regions: ['EU', 'ASIA', 'WORLDWIDE']
  },
  [ShippingCarrier.USPS]: {
    name: 'USPS',
    trackingUrlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1={trackingNumber}',
    estimatedDays: { min: 2, max: 8 },
    regions: ['US']
  },
  [ShippingCarrier.TNT]: {
    name: 'TNT',
    trackingUrlTemplate: 'https://www.tnt.com/express/track.do?trackingNumber={trackingNumber}',
    estimatedDays: { min: 2, max: 7 },
    regions: ['EU', 'WORLDWIDE']
  },
  [ShippingCarrier.DPEX]: {
    name: 'DPEX',
    trackingUrlTemplate: 'https://www.dpex.com/tracking?trackingNumber={trackingNumber}',
    estimatedDays: { min: 3, max: 10 },
    regions: ['ASIA']
  },
  [ShippingCarrier.ARAMEX]: {
    name: 'Aramex',
    trackingUrlTemplate: 'https://www.aramex.com/track/shipments?trackingNumber={trackingNumber}',
    estimatedDays: { min: 3, max: 10 },
    regions: ['MIDDLE_EAST', 'ASIA']
  },
  [ShippingCarrier.SF_EXPRESS]: {
    name: 'SF Express',
    trackingUrlTemplate: 'https://www.sf-express.com/track?trackingNumber={trackingNumber}',
    estimatedDays: { min: 2, max: 5 },
    regions: ['ASIA', 'CHINA']
  },
  [ShippingCarrier.CHINA_POST]: {
    name: 'China Post',
    trackingUrlTemplate: 'http://yjcx.chinapost.com.cn/qps/english/yjcx?trackingNumber={trackingNumber}',
    estimatedDays: { min: 7, max: 21 },
    regions: ['CHINA', 'WORLDWIDE']
  },
  [ShippingCarrier.OTHER]: {
    name: 'Other Carrier',
    trackingUrlTemplate: '',
    estimatedDays: { min: 1, max: 14 },
    regions: ['WORLDWIDE']
  }
};

// 订单状态详情接口
export interface OrderStatusDetails {
  orderId: string;
  currentStatus: OrderStatus;
  statusHistory: OrderStatusHistory[];
  estimatedDeliveryDate?: Date;
  trackingNumber?: string;
  carrier?: ShippingCarrier;
  carrierName?: string;
  trackingUrl?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

// 状态配置 - 国际化标准
export const StatusConfig = {
  [OrderStatus.PENDING]: {
    label: 'Order Placed',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '📋',
    description: 'Your order has been placed and is waiting for confirmation'
  },
  [OrderStatus.CONFIRMED]: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800',
    icon: '✅',
    description: 'Order confirmed and ready for payment processing'
  },
  [OrderStatus.PAID]: {
    label: 'Payment Received',
    color: 'bg-green-100 text-green-800',
    icon: '💳',
    description: 'Payment received successfully, preparing your order'
  },
  [OrderStatus.PROCESSING]: {
    label: 'Processing',
    color: 'bg-purple-100 text-purple-800',
    icon: '📦',
    description: 'Your order is being prepared for shipment'
  },
  [OrderStatus.SHIPPED]: {
    label: 'Shipped',
    color: 'bg-indigo-100 text-indigo-800',
    icon: '🚚',
    description: 'Your order has been shipped and is on its way'
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    label: 'Out for Delivery',
    color: 'bg-blue-100 text-blue-800',
    icon: '🚛',
    description: 'Your order is out for delivery and will arrive soon'
  },
  [OrderStatus.DELIVERED]: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800',
    icon: '🎉',
    description: 'Your order has been successfully delivered'
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: '✨',
    description: 'Order completed successfully'
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: '❌',
    description: 'Order has been cancelled'
  },
  [OrderStatus.REFUNDED]: {
    label: 'Refunded',
    color: 'bg-gray-100 text-gray-800',
    icon: '💰',
    description: 'Order has been refunded'
  }
};

// 状态流程定义 - 国际物流标准流程
export const StatusFlow: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: []
};

interface OrderStatusState {
  orders: { [orderId: string]: OrderStatusDetails };
  
  // 获取订单状态详情
  getOrderStatus: (orderId: string) => OrderStatusDetails | null;
  
  // 更新订单状态
  updateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    trackingNumber?: string,
    location?: string
  ) => void;
  
  // 添加状态历史记录
  addStatusHistory: (
    orderId: string,
    status: OrderStatus,
    note?: string,
    trackingNumber?: string,
    location?: string
  ) => void;
  
  // 获取状态历史
  getStatusHistory: (orderId: string) => OrderStatusHistory[];
  
  // 检查状态是否可以更新
  canUpdateStatus: (orderId: string, newStatus: OrderStatus) => boolean;
  
  // 获取下一个可能的状态
  getNextPossibleStatuses: (orderId: string) => OrderStatus[];
  
  // 初始化订单状态
  initializeOrder: (orderId: string, initialStatus?: OrderStatus) => void;
  
  // 设置预计送达日期
  setEstimatedDeliveryDate: (orderId: string, date: Date) => void;
  
  // 设置物流信息
  setTrackingInfo: (orderId: string, trackingNumber: string, carrier?: ShippingCarrier, carrierName?: string) => void;
  
  // 清除订单数据
  clearOrder: (orderId: string) => void;
}

export const useOrderStatusStore = create<OrderStatusState>()(
  persist(
    (set, get) => ({
      orders: {},
      
      getOrderStatus: (orderId: string) => {
        const state = get();
        return state.orders[orderId] || null;
      },
      
      updateOrderStatus: (
        orderId: string,
        newStatus: OrderStatus,
        note?: string,
        trackingNumber?: string,
        location?: string
      ) => {
        const state = get();
        const order = state.orders[orderId];
        
        if (!order) {
          console.warn(`订单 ${orderId} 不存在`);
          return;
        }
        
        // 检查状态更新是否合法
        if (!state.canUpdateStatus(orderId, newStatus)) {
          console.warn(`无法将订单 ${orderId} 从 ${order.currentStatus} 更新为 ${newStatus}`);
          return;
        }
        
        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              ...order,
              currentStatus: newStatus,
              statusHistory: [
                ...order.statusHistory,
                {
                  id: `${orderId}-${Date.now()}`,
                  status: newStatus,
                  timestamp: new Date(),
                  note,
                  trackingNumber,
                  location
                }
              ]
            }
          }
        }));
      },
      
      addStatusHistory: (
        orderId: string,
        status: OrderStatus,
        note?: string,
        trackingNumber?: string,
        location?: string
      ) => {
        const state = get();
        const order = state.orders[orderId];
        
        if (!order) {
          console.warn(`订单 ${orderId} 不存在`);
          return;
        }
        
        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              ...order,
              statusHistory: [
                ...order.statusHistory,
                {
                  id: `${orderId}-${Date.now()}`,
                  status,
                  timestamp: new Date(),
                  note,
                  trackingNumber,
                  location
                }
              ]
            }
          }
        }));
      },
      
      getStatusHistory: (orderId: string) => {
        const state = get();
        const order = state.orders[orderId];
        return order ? order.statusHistory.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ) : [];
      },
      
      canUpdateStatus: (orderId: string, newStatus: OrderStatus) => {
        const state = get();
        const order = state.orders[orderId];
        
        if (!order) return false;
        
        const allowedStatuses = StatusFlow[order.currentStatus];
        return allowedStatuses.includes(newStatus);
      },
      
      getNextPossibleStatuses: (orderId: string) => {
        const state = get();
        const order = state.orders[orderId];
        
        if (!order) return [];
        
        return StatusFlow[order.currentStatus] || [];
      },
      
      initializeOrder: (orderId: string, initialStatus = OrderStatus.PENDING) => {
        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              orderId,
              currentStatus: initialStatus,
              statusHistory: [
                {
                  id: `${orderId}-init`,
                  status: initialStatus,
                  timestamp: new Date(),
                  note: '订单已创建'
                }
              ]
            }
          }
        }));
      },
      
      setEstimatedDeliveryDate: (orderId: string, date: Date) => {
        const state = get();
        const order = state.orders[orderId];
        
        if (!order) return;
        
        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              ...order,
              estimatedDeliveryDate: date
            }
          }
        }));
      },
      
      setTrackingInfo: (orderId: string, trackingNumber: string, carrier?: ShippingCarrier, carrierName?: string) => {
        const state = get();
        const order = state.orders[orderId];
        
        if (!order) return;
        
        // 生成跟踪URL
        let trackingUrl = '';
        if (carrier && trackingNumber) {
          const carrierConfig = CarrierConfig[carrier];
          if (carrierConfig.trackingUrlTemplate) {
            trackingUrl = carrierConfig.trackingUrlTemplate.replace('{trackingNumber}', trackingNumber);
          }
        }
        
        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              ...order,
              trackingNumber,
              carrier,
              carrierName: carrierName || (carrier ? CarrierConfig[carrier].name : undefined),
              trackingUrl
            }
          }
        }));
      },
      
      clearOrder: (orderId: string) => {
        set((state) => {
          const { [orderId]: removed, ...rest } = state.orders;
          return { orders: rest };
        });
      }
    }),
    {
      name: 'order-status-storage',
      version: 1
    }
  )
); 