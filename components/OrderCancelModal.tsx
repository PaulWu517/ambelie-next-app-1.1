'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

interface OrderCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, details?: string) => Promise<void>;
  orderNumber: string;
  orderAmount: number;
  currency: string;
  isLoading?: boolean;
}

const CANCEL_REASONS = [
  { value: 'change_mind', label: 'Changed my mind' },
  { value: 'wrong_item', label: 'Ordered wrong item' },
  { value: 'found_better_price', label: 'Found better price elsewhere' },
  { value: 'delivery_too_slow', label: 'Delivery taking too long' },
  { value: 'financial_reasons', label: 'Financial reasons' },
  { value: 'quality_concerns', label: 'Quality concerns' },
  { value: 'duplicate_order', label: 'Duplicate order' },
  { value: 'other', label: 'Other reason' },
];

const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  orderAmount,
  currency,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNext = () => {
    if (selectedReason) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    setStep('reason');
  };

  const handleConfirm = async () => {
    if (selectedReason) {
      try {
        await onConfirm(selectedReason, additionalDetails);
        handleClose();
      } catch (error) {
        console.error('Failed to cancel order:', error);
        // 不关闭模态框，让用户知道操作失败
      }
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setAdditionalDetails('');
    setStep('reason');
    onClose();
  };

  const getReasonLabel = (value: string) => {
    return CANCEL_REASONS.find(reason => reason.value === value)?.label || value;
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
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    animation: 'fadeInScale 0.3s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(to right, #fef2f2, #fff7ed)',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  };

  const contentStyle: React.CSSProperties = {
    padding: '24px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#dc2626',
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151',
  };

  const modalContent = (
    <>
      <style>
        {`
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
      <div style={modalOverlayStyle} onClick={handleClose}>
        <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#fecaca',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertTriangle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  Cancel Order
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

          {/* Content */}
          <div style={contentStyle}>
            {step === 'reason' ? (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  Why are you canceling this order?
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                  Please select a reason to help us improve our service.
                </p>

                {/* Reason Options */}
                <div style={{ marginBottom: '20px' }}>
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        marginBottom: '8px',
                        border: selectedReason === reason.value ? '2px solid #dc2626' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: selectedReason === reason.value ? '#fef2f2' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        style={{ marginRight: '12px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#111827' }}>{reason.label}</span>
                    </label>
                  ))}
                </div>

                {/* Additional Details */}
                {(selectedReason === 'other' || selectedReason === 'quality_concerns') && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Additional details (optional)
                    </label>
                    <textarea
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'none',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Please provide more details..."
                    />
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={handleClose}
                    style={{ ...secondaryButtonStyle, flex: 1 }}
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!selectedReason}
                    style={{
                      ...primaryButtonStyle,
                      flex: 1,
                      opacity: !selectedReason ? 0.5 : 1,
                      cursor: !selectedReason ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  Confirm Order Cancellation
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                  Are you sure you want to cancel this order? This action cannot be undone.
                </p>

                {/* Order Summary */}
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Order Number:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>#{orderNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Order Amount:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      ${orderAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Cancel Reason:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {getReasonLabel(selectedReason)}
                    </span>
                  </div>
                </div>

                {/* Refund Information */}
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#0ea5e9',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <RefreshCw style={{ width: '16px', height: '16px', color: 'white' }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e', margin: 0 }}>
                        Refund Information
                      </h4>
                      <p style={{ fontSize: '14px', color: '#075985', margin: '4px 0 0 0' }}>
                        A full refund of <strong>${orderAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</strong> will be processed to your original payment method within 3-5 business days.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleBack}
                    disabled={isLoading}
                    style={{
                      ...secondaryButtonStyle,
                      flex: 1,
                      opacity: isLoading ? 0.5 : 1,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    style={{
                      ...primaryButtonStyle,
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: isLoading ? 0.8 : 1,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Canceling...
                      </>
                    ) : (
                      'Cancel Order'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default OrderCancelModal; 