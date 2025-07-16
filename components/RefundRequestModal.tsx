'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, RefreshCw, AlertCircle, Clock } from 'lucide-react';

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (refundData: RefundRequest) => Promise<void>;
  orderNumber: string;
  orderAmount: number;
  currency: string;
  orderItems: any[];
  isLoading?: boolean;
}

interface RefundRequest {
  reason: string;
  refundType: 'full' | 'partial';
  amount: number;
  items?: string[];
  details?: string;
}

const REFUND_REASONS = [
  { value: 'defective_item', label: 'Defective or damaged item' },
  { value: 'not_as_described', label: 'Item not as described' },
  { value: 'wrong_item_shipped', label: 'Wrong item shipped' },
  { value: 'late_delivery', label: 'Late delivery' },
  { value: 'changed_mind', label: 'Changed mind' },
  { value: 'duplicate_order', label: 'Duplicate order' },
  { value: 'quality_issues', label: 'Quality issues' },
  { value: 'other', label: 'Other reason' },
];

const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  orderAmount,
  currency,
  orderItems,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState<number>(orderAmount);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [step, setStep] = useState<'reason' | 'amount' | 'confirm'>('reason');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNext = () => {
    if (step === 'reason' && selectedReason) {
      setStep('amount');
    } else if (step === 'amount') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('amount');
    } else if (step === 'amount') {
      setStep('reason');
    }
  };

  const handleConfirm = async () => {
    const refundData: RefundRequest = {
      reason: selectedReason,
      refundType,
      amount: refundAmount,
      items: refundType === 'partial' ? selectedItems : undefined,
      details: additionalDetails,
    };

    try {
      await onConfirm(refundData);
      handleClose();
    } catch (error) {
      console.error('Failed to request refund:', error);
      // 不关闭模态框，让用户知道操作失败
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setRefundType('full');
    setRefundAmount(orderAmount);
    setSelectedItems([]);
    setAdditionalDetails('');
    setStep('reason');
    onClose();
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const calculatePartialRefund = () => {
    if (refundType === 'full' || !orderItems) return orderAmount;
    
    const selectedItemsData = orderItems.filter(item => selectedItems.includes(item.id.toString()));
    return selectedItemsData.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getReasonLabel = (value: string) => {
    return REFUND_REASONS.find(reason => reason.value === value)?.label || value;
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
    maxWidth: '650px',
    maxHeight: '90vh',
    overflow: 'auto',
    animation: 'fadeInScale 0.3s ease-out',
  };

  const stepIndicatorStyle = (stepNumber: number, currentStep: string) => {
    const steps = ['reason', 'amount', 'confirm'];
    const isActive = steps.indexOf(currentStep) >= stepNumber - 1;
    const isCurrent = steps[stepNumber - 1] === currentStep;
    
    return {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: isActive ? '#10b981' : '#e5e7eb',
      color: isActive ? 'white' : '#6b7280',
      border: isCurrent ? '2px solid #10b981' : 'none',
      boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none',
    };
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
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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
            background: 'linear-gradient(to right, #ecfdf5, #f0fdf4)',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#d1fae5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <DollarSign style={{ width: '20px', height: '20px', color: '#059669' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  Request Refund
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

          {/* Progress Indicator */}
          <div style={{
            padding: '20px 24px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={stepIndicatorStyle(1, step)}>1</div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: step === 'reason' ? '#059669' : '#6b7280' }}>
                  Reason
                </span>
              </div>
              <div style={{ flex: 1, height: '2px', backgroundColor: step === 'amount' || step === 'confirm' ? '#10b981' : '#e5e7eb', margin: '0 16px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={stepIndicatorStyle(2, step)}>2</div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: step === 'amount' ? '#059669' : '#6b7280' }}>
                  Amount
                </span>
              </div>
              <div style={{ flex: 1, height: '2px', backgroundColor: step === 'confirm' ? '#10b981' : '#e5e7eb', margin: '0 16px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={stepIndicatorStyle(3, step)}>3</div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: step === 'confirm' ? '#059669' : '#6b7280' }}>
                  Confirm
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {step === 'reason' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  Why are you requesting a refund?
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                  Please select the reason for your refund request.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  {REFUND_REASONS.map((reason) => (
                    <label
                      key={reason.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        marginBottom: '8px',
                        border: selectedReason === reason.value ? '2px solid #059669' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: selectedReason === reason.value ? '#ecfdf5' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="refundReason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        style={{ marginRight: '12px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#111827' }}>{reason.label}</span>
                    </label>
                  ))}
                </div>

                {(selectedReason === 'other' || selectedReason === 'quality_issues') && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Additional details (optional)
                    </label>
                    <textarea
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: 'none',
                      }}
                      placeholder="Please provide more details..."
                    />
                  </div>
                )}
              </div>
            )}

            {step === 'amount' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  Refund Amount
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                  Choose between full or partial refund.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <label style={{
                      flex: 1,
                      padding: '16px',
                      border: refundType === 'full' ? '2px solid #059669' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: refundType === 'full' ? '#ecfdf5' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}>
                      <input
                        type="radio"
                        name="refundType"
                        value="full"
                        checked={refundType === 'full'}
                        onChange={(e) => setRefundType(e.target.value as 'full' | 'partial')}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        Full Refund
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        ${orderAmount.toFixed(2)} {currency}
                      </div>
                    </label>

                    <label style={{
                      flex: 1,
                      padding: '16px',
                      border: refundType === 'partial' ? '2px solid #059669' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: refundType === 'partial' ? '#ecfdf5' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}>
                      <input
                        type="radio"
                        name="refundType"
                        value="partial"
                        checked={refundType === 'partial'}
                        onChange={(e) => setRefundType(e.target.value as 'full' | 'partial')}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        Partial Refund
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Select items
                      </div>
                    </label>
                  </div>

                  {refundType === 'partial' && orderItems && (
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                        Select items to refund:
                      </h4>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                        {orderItems.map((item) => (
                          <label
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px',
                              marginBottom: '8px',
                              backgroundColor: selectedItems.includes(item.id.toString()) ? '#ecfdf5' : 'transparent',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id.toString())}
                                onChange={() => handleItemToggle(item.id.toString())}
                              />
                              <span style={{ fontSize: '14px', color: '#111827' }}>
                                {item.product?.name || 'Unknown item'} (Qty: {item.quantity})
                              </span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div style={{ marginTop: '12px', textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Partial refund amount: </span>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                          ${calculatePartialRefund().toFixed(2)} {currency}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  Confirm Refund Request
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                  Please review your refund request details.
                </p>

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
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Refund Type:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {refundType === 'full' ? 'Full Refund' : 'Partial Refund'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Refund Amount:</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#059669' }}>
                      ${(refundType === 'full' ? orderAmount : calculatePartialRefund()).toFixed(2)} {currency}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Reason:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {getReasonLabel(selectedReason)}
                    </span>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Clock style={{ width: '16px', height: '16px', color: 'white' }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                        Processing Timeline
                      </h4>
                      <p style={{ fontSize: '14px', color: '#1e40af', margin: '4px 0 0 0' }}>
                        Refunds are typically processed within 3-5 business days. You will receive an email confirmation once approved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {step !== 'reason' && (
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    opacity: isLoading ? 0.5 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Back
                </button>
              )}
              
              <button
                onClick={handleClose}
                disabled={isLoading}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>

              {step !== 'confirm' ? (
                <button
                  onClick={handleNext}
                  disabled={!selectedReason || (step === 'amount' && refundType === 'partial' && selectedItems.length === 0)}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    backgroundColor: '#059669',
                    color: 'white',
                    opacity: (!selectedReason || (step === 'amount' && refundType === 'partial' && selectedItems.length === 0)) ? 0.5 : 1,
                    cursor: (!selectedReason || (step === 'amount' && refundType === 'partial' && selectedItems.length === 0)) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    backgroundColor: '#059669',
                    color: 'white',
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
                      Submitting...
                    </>
                  ) : (
                    'Submit Refund Request'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default RefundRequestModal; 