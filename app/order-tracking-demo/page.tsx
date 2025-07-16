'use client';

import React, { useEffect, useState } from 'react';
import { useOrderStatusStore, OrderStatus, ShippingCarrier } from '@/lib/stores/orderStatusStore';
import OrderTimeline from '@/components/OrderTimeline';

const OrderTrackingDemo = () => {
  const { 
    initializeOrder, 
    updateOrderStatus, 
    getOrderStatus, 
    getStatusHistory,
    setTrackingInfo,
    setEstimatedDeliveryDate
  } = useOrderStatusStore();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>('demo-order-001');
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatus | null>(null);
  
  // 演示订单数据
  const demoOrders = [
    { id: 'demo-order-001', name: '演示订单 001 - 基础流程' },
    { id: 'demo-order-002', name: '演示订单 002 - 完整流程' },
    { id: 'demo-order-003', name: '演示订单 003 - 取消流程' }
  ];
  
  useEffect(() => {
    // 初始化演示数据
    initializeDemoData();
  }, []);
  
  const initializeDemoData = () => {
    // 订单 001 - 基础流程
    const order1 = 'demo-order-001';
    initializeOrder(order1, OrderStatus.PAID);
    updateOrderStatus(order1, OrderStatus.PAID, '订单已支付，准备处理');
    
    // 订单 002 - 完整流程
    const order2 = 'demo-order-002';
    initializeOrder(order2, OrderStatus.SHIPPED);
    updateOrderStatus(order2, OrderStatus.CONFIRMED, '订单已确认');
    updateOrderStatus(order2, OrderStatus.PAID, '支付成功');
    updateOrderStatus(order2, OrderStatus.PROCESSING, '订单处理中，正在准备商品');
    updateOrderStatus(order2, OrderStatus.SHIPPED, '订单已发货', 'YTO1234567890', '上海分拣中心');
    setTrackingInfo(order2, 'YTO1234567890', ShippingCarrier.SF_EXPRESS, 'SF Express');
    setEstimatedDeliveryDate(order2, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    
    // 订单 003 - 取消流程
    const order3 = 'demo-order-003';
    initializeOrder(order3, OrderStatus.CANCELLED);
    updateOrderStatus(order3, OrderStatus.CONFIRMED, '订单已确认');
    updateOrderStatus(order3, OrderStatus.CANCELLED, '用户取消订单');
    
    // 设置默认选择的订单状态
    setCurrentOrderStatus(getOrderStatus(selectedOrderId)?.currentStatus || null);
  };
  
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const orderStatus = getOrderStatus(orderId);
    setCurrentOrderStatus(orderStatus?.currentStatus || null);
  };
  
  const handleStatusUpdate = (newStatus: OrderStatus) => {
    updateOrderStatus(selectedOrderId, newStatus, `手动更新状态至 ${newStatus}`);
    setCurrentOrderStatus(newStatus);
  };
  
  const selectedOrder = getOrderStatus(selectedOrderId);
  const statusHistory = getStatusHistory(selectedOrderId);
  
  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">International Order Tracking System Demo</h1>
          <p className="text-gray-600">Experience comprehensive order tracking functionality with international shipping standards</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧控制面板 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">控制面板</h2>
              
              {/* 订单选择 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">选择演示订单</h3>
                <div className="space-y-2">
                  {demoOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleOrderSelect(order.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedOrderId === order.id
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-sm font-medium">{order.name}</div>
                      <div className="text-xs text-gray-500">订单号: {order.id}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 状态更新按钮 */}
              {selectedOrder && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">状态操作</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.CONFIRMED)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      确认订单
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.PAID)}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      标记已付款
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.PROCESSING)}
                      className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                    >
                      开始处理
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.SHIPPED)}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      标记已发货
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.DELIVERED)}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      标记已送达
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.CANCELLED)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      取消订单
                    </button>
                  </div>
                </div>
              )}
              
              {/* 当前状态信息 */}
              {selectedOrder && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">当前状态</h3>
                  <div className="text-sm text-gray-600">
                    <p>订单ID: {selectedOrder.orderId}</p>
                    <p>当前状态: {selectedOrder.currentStatus}</p>
                    <p>历史记录: {statusHistory.length} 条</p>
                    {selectedOrder.trackingNumber && (
                      <p>物流单号: {selectedOrder.trackingNumber}</p>
                    )}
                    {selectedOrder.carrier && (
                      <p>承运商: {selectedOrder.carrier}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 右侧时间轴展示 */}
          <div className="lg:col-span-2">
            {selectedOrder && statusHistory.length > 0 ? (
              <OrderTimeline
                statusHistory={statusHistory}
                currentStatus={selectedOrder.currentStatus}
                trackingNumber={selectedOrder.trackingNumber}
                carrier={selectedOrder.carrier}
                estimatedDeliveryDate={selectedOrder.estimatedDeliveryDate}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-500">请选择一个订单查看状态跟踪</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 功能介绍 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">🔄 状态流程管理</h3>
            <p className="text-gray-600 text-sm">
              智能的状态流程控制，确保订单状态按正确顺序更新，防止无效的状态转换。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">📋 历史记录追踪</h3>
            <p className="text-gray-600 text-sm">
              完整记录每个状态变更的时间、备注和相关信息，提供完整的订单处理历史。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">🚚 物流信息集成</h3>
            <p className="text-gray-600 text-sm">
              支持物流跟踪号、承运商信息和预计送达时间，提供完整的物流跟踪体验。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingDemo; 