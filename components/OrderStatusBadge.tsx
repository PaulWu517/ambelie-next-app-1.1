'use client';

import React from 'react';
import { Clock, CheckCircle, XCircle, Truck, Package, CreditCard, AlertCircle } from 'lucide-react';
import { OrderStatus, StatusConfig } from '@/lib/stores/orderStatusStore';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  trackingNumber?: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  trackingNumber,
  className = '',
  showIcon = true,
  size = 'md'
}) => {
  const getStatusIcon = (status: OrderStatus) => {
    const iconClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    
    switch (status) {
      case OrderStatus.PENDING:
        return <Clock className={`${iconClass} text-yellow-600`} />;
      case OrderStatus.CONFIRMED:
        return <CheckCircle className={`${iconClass} text-blue-600`} />;
      case OrderStatus.PAID:
        return <CreditCard className={`${iconClass} text-green-600`} />;
      case OrderStatus.PROCESSING:
        return <Package className={`${iconClass} text-purple-600`} />;
      case OrderStatus.SHIPPED:
        return <Truck className={`${iconClass} text-indigo-600`} />;
      case OrderStatus.OUT_FOR_DELIVERY:
        return <Truck className={`${iconClass} text-blue-600`} />;
      case OrderStatus.DELIVERED:
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case OrderStatus.COMPLETED:
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case OrderStatus.CANCELLED:
        return <XCircle className={`${iconClass} text-red-600`} />;
      case OrderStatus.REFUNDED:
        return <AlertCircle className={`${iconClass} text-gray-600`} />;
      default:
        return <Clock className={`${iconClass} text-gray-600`} />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    const config = StatusConfig[status];
    return config ? config.color : 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: OrderStatus) => {
    const config = StatusConfig[status];
    return config ? config.label : status;
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const isInProgress = () => {
    return [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.OUT_FOR_DELIVERY
    ].includes(status);
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span 
        className={`
          inline-flex items-center gap-1 rounded-full font-medium border
          ${getStatusColor(status)} ${getSizeClasses()}
        `}
      >
        {showIcon && getStatusIcon(status)}
        {getStatusLabel(status)}
      </span>
      
      {/* Progress indicator for in-progress orders */}
      {isInProgress() && trackingNumber && (
        <div className="flex items-center text-xs text-gray-500">
          <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
          <span>Tracking Available</span>
        </div>
      )}
    </div>
  );
};

export default OrderStatusBadge; 