'use client';

import React from 'react';
import { Clock, CheckCircle, XCircle, Truck, Package, CreditCard, AlertCircle, MapPin } from 'lucide-react';
import { OrderStatus, OrderStatusHistory, StatusConfig } from '@/lib/stores/orderStatusStore';

interface OrderTimelineProps {
  statusHistory: OrderStatusHistory[];
  currentStatus: OrderStatus;
  estimatedDeliveryDate?: Date;
  trackingNumber?: string;
  carrier?: string;
  className?: string;
}

const OrderTimeline: React.FC<OrderTimelineProps> = ({
  statusHistory,
  currentStatus,
  estimatedDeliveryDate,
  trackingNumber,
  carrier,
  className = ''
}) => {
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case OrderStatus.CONFIRMED:
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case OrderStatus.PAID:
        return <CreditCard className="w-4 h-4 text-green-600" />;
      case OrderStatus.PROCESSING:
        return <Package className="w-4 h-4 text-purple-600" />;
      case OrderStatus.SHIPPED:
        return <Truck className="w-4 h-4 text-indigo-600" />;
      case OrderStatus.OUT_FOR_DELIVERY:
        return <Truck className="w-4 h-4 text-blue-600" />;
      case OrderStatus.DELIVERED:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case OrderStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case OrderStatus.CANCELLED:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case OrderStatus.REFUNDED:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    const config = StatusConfig[status];
    return config ? config.color : 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: OrderStatus) => {
    const config = StatusConfig[status];
    return config ? config.label : status;
  };

  const isStatusCompleted = (status: OrderStatus) => {
    const completedStatuses = [
      OrderStatus.CONFIRMED,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED
    ];
    return completedStatuses.includes(status);
  };

  const isStatusCurrent = (status: OrderStatus) => {
    return status === currentStatus;
  };

  const sortedHistory = [...statusHistory].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className={`order-timeline ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Order Tracking</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
            {getStatusLabel(currentStatus)}
          </div>
        </div>

        {/* Shipping Information */}
        {trackingNumber && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <Truck className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">Shipping Information</span>
            </div>
            <div className="ml-7 text-sm text-blue-800">
              <p>Tracking Number: <span className="font-mono">{trackingNumber}</span></p>
              {carrier && <p>Carrier: {carrier}</p>}
              {estimatedDeliveryDate && (
                <p>Estimated Delivery: {formatDate(estimatedDeliveryDate)}</p>
              )}
            </div>
          </div>
        )}

        {/* 状态时间线 */}
        <div className="relative">
          {sortedHistory.map((historyItem, index) => {
            const isLast = index === sortedHistory.length - 1;
            const isCompleted = isStatusCompleted(historyItem.status);
            const isCurrent = isStatusCurrent(historyItem.status);
            
            return (
              <div key={historyItem.id} className="relative flex items-start">
                {/* 时间线 */}
                {!isLast && (
                  <div 
                    className={`absolute left-6 top-12 w-0.5 h-16 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-300'
                    }`}
                  />
                )}
                
                {/* 状态图标 */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                  isCurrent 
                    ? 'bg-blue-100 border-blue-500' 
                    : isCompleted 
                      ? 'bg-green-100 border-green-500' 
                      : 'bg-gray-100 border-gray-300'
                }`}>
                  {getStatusIcon(historyItem.status)}
                </div>
                
                {/* 状态详情 */}
                <div className="ml-4 flex-1 pb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${
                        isCurrent ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {getStatusLabel(historyItem.status)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(historyItem.timestamp)}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Current Status
                      </span>
                    )}
                  </div>
                  
                  {/* 备注信息 */}
                  {historyItem.note && (
                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {historyItem.note}
                    </p>
                  )}
                  
                  {/* 位置信息 */}
                  {historyItem.location && (
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{historyItem.location}</span>
                    </div>
                  )}
                  
                  {/* Tracking Information */}
                  {historyItem.trackingNumber && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Tracking Number:</span>
                      <span className="ml-2 font-mono">{historyItem.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Estimated Delivery */}
        {estimatedDeliveryDate && currentStatus !== OrderStatus.DELIVERED && currentStatus !== OrderStatus.COMPLETED && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">Estimated Delivery Date</p>
                <p className="text-sm text-gray-600">{formatDate(estimatedDeliveryDate)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTimeline; 