'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, MapPin, Phone, Mail, RefreshCw } from 'lucide-react';

interface OrderModifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (modifications: OrderModification) => Promise<void>;
  orderNumber: string;
  currentData: {
    shippingAddress?: any;
    customerPhone?: string;
    customerEmail?: string;
    customerName?: string;
  };
  isLoading?: boolean;
}

interface OrderModification {
  shippingAddress?: any;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
}

const OrderModifyModal: React.FC<OrderModifyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  currentData,
  isLoading = false,
}) => {
  const [modifications, setModifications] = useState<OrderModification>({});
  const [activeTab, setActiveTab] = useState<'address' | 'contact'>('address');
  const [hasChanges, setHasChanges] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    // 地址信息
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    // 联系信息
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  });

  // 初始化mounted状态
  useEffect(() => {
    setMounted(true);
  }, []);

  // 初始化表单数据
  useEffect(() => {
    if (isOpen && currentData) {
      const address = currentData.shippingAddress || {};
      setFormData({
        line1: address.line1 || '',
        line2: address.line2 || '',
        city: address.city || '',
        state: address.state || '',
        postal_code: address.postal_code || '',
        country: address.country || '',
        customerName: currentData.customerName || '',
        customerPhone: currentData.customerPhone || '',
        customerEmail: currentData.customerEmail || '',
      });
    }
  }, [isOpen, currentData]);

  // 检查是否有变化
  useEffect(() => {
    if (!currentData) return;
    
    const address = currentData.shippingAddress || {};
    const addressChanged = 
      formData.line1 !== (address.line1 || '') ||
      formData.line2 !== (address.line2 || '') ||
      formData.city !== (address.city || '') ||
      formData.state !== (address.state || '') ||
      formData.postal_code !== (address.postal_code || '') ||
      formData.country !== (address.country || '');

    const contactChanged = 
      formData.customerName !== (currentData.customerName || '') ||
      formData.customerPhone !== (currentData.customerPhone || '') ||
      formData.customerEmail !== (currentData.customerEmail || '');

    setHasChanges(addressChanged || contactChanged);
  }, [formData, currentData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfirm = async () => {
    const updates: OrderModification = {};

    // 检查地址变化
    const currentAddress = currentData.shippingAddress || {};
    const newAddress = {
      line1: formData.line1,
      line2: formData.line2,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      country: formData.country,
    };

    if (JSON.stringify(newAddress) !== JSON.stringify(currentAddress)) {
      updates.shippingAddress = newAddress;
    }

    // 检查联系信息变化
    if (formData.customerName !== (currentData.customerName || '')) {
      updates.customerName = formData.customerName;
    }
    if (formData.customerPhone !== (currentData.customerPhone || '')) {
      updates.customerPhone = formData.customerPhone;
    }
    if (formData.customerEmail !== (currentData.customerEmail || '')) {
      updates.customerEmail = formData.customerEmail;
    }

    if (Object.keys(updates).length > 0) {
      try {
        await onConfirm(updates);
        handleClose();
      } catch (error) {
        console.error('Failed to modify order:', error);
        // 不关闭模态框，让用户知道操作失败
      }
    }
  };

  const handleClose = () => {
    setModifications({});
    setActiveTab('address');
    setHasChanges(false);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    animation: 'fadeInScale 0.3s ease-out',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  };

  const modalContent = (
    <>
      <style>
        {`
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
      <div style={modalOverlayStyle} onClick={handleClose}>
        <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(to right, #eff6ff, #f0f9ff)',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#dbeafe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Edit style={{ width: '20px', height: '20px', color: '#2563eb' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  Modify Order
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  Order #{orderNumber}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              disabled={isLoading}
            >
              <X style={{ width: '16px', height: '16px', color: '#6b7280' }} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}>
            <button
              onClick={() => setActiveTab('address')}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                backgroundColor: activeTab === 'address' ? 'white' : 'transparent',
                borderBottom: activeTab === 'address' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'address' ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <MapPin style={{ width: '16px', height: '16px' }} />
              Shipping Address
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                backgroundColor: activeTab === 'contact' ? 'white' : 'transparent',
                borderBottom: activeTab === 'contact' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'contact' ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Phone style={{ width: '16px', height: '16px' }} />
              Contact Info
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {activeTab === 'address' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    Shipping Address
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    Update your shipping address (only before shipment).
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={formData.line1}
                      onChange={(e) => handleInputChange('line1', e.target.value)}
                      style={inputStyle}
                      placeholder="Street address, P.O. box, company name"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.line2}
                      onChange={(e) => handleInputChange('line2', e.target.value)}
                      style={inputStyle}
                      placeholder="Apartment, suite, unit, building, floor, etc."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        style={inputStyle}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                        State/Province *
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        style={inputStyle}
                        placeholder="State/Province"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        style={inputStyle}
                        placeholder="Postal Code"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                        Country *
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Select Country</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="CN">China</option>
                        <option value="UK">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="JP">Japan</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    Contact Information
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    Update your contact details for this order.
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      style={inputStyle}
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      style={inputStyle}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      style={inputStyle}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Important Notice */}
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '20px',
            }}>
              <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
                <strong>Important:</strong> Order modifications are only allowed before shipment. 
                Once your order has been shipped, you will need to contact customer support for any changes.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={handleClose}
                disabled={isLoading}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !hasChanges}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  backgroundColor: '#2563eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (isLoading || !hasChanges) ? 0.5 : 1,
                  cursor: (isLoading || !hasChanges) ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    Updating...
                  </>
                ) : (
                  'Update Order'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default OrderModifyModal; 