'use client';

import React, { useState } from 'react';

interface EnquireSimilarModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productUrl: string;
}

export default function EnquireSimilarModal({ isOpen, onClose, productName, productUrl }: EnquireSimilarModalProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(`I am interested in finding a product similar to ${productName}. Could you please let me know if you have anything similar in stock or if you can source it for me?`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
      const response = await fetch(`${API_URL}/api/inquiries/enquire-similar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          message,
          productName,
          productUrl
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit enquiry');
      }

      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
        setEmail('');
        setMessage(`I am interested in finding a product similar to ${productName}. Could you please let me know if you have anything similar in stock or if you can source it for me?`);
      }, 3000);
    } catch (error) {
      console.error('Error submitting enquiry:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        
        <h2 style={titleStyle}>Enquire Similar</h2>
        
        {submitStatus === 'success' ? (
          <div style={successContainerStyle}>
            <div style={successIconStyle}>✓</div>
            <h3 style={successTitleStyle}>Enquiry Sent</h3>
            <p style={successTextStyle}>Thank you for your interest. Our team will review your request and get back to you at {email} shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            <p style={descStyle}>
              This item is currently sold out. Please leave your email and message below, and our team will help you find a similar piece or source one for you.
            </p>
            
            <div style={inputGroupStyle}>
              <label htmlFor="enquire-email" style={labelStyle}>Your Email *</label>
              <input 
                id="enquire-email"
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="Enter your email address"
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label htmlFor="enquire-message" style={labelStyle}>Message *</label>
              <textarea 
                id="enquire-message"
                required 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                style={textareaStyle}
                rows={5}
              />
            </div>

            {submitStatus === 'error' && (
              <div style={errorStyle}>Failed to send enquiry. Please try again later.</div>
            )}

            <button 
              type="submit" 
              style={{...submitBtnStyle, opacity: isSubmitting ? 0.7 : 1}} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'SENDING...' : 'SEND ENQUIRY'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '40px',
  borderRadius: '8px',
  maxWidth: '500px',
  width: '90%',
  position: 'relative',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  fontFamily: 'var(--font-body), sans-serif',
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '15px',
  right: '20px',
  background: 'none',
  border: 'none',
  fontSize: '28px',
  cursor: 'pointer',
  color: '#666',
  padding: '0',
  lineHeight: '1',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading), serif',
  fontSize: '1.8rem',
  marginBottom: '20px',
  fontWeight: 'normal',
  color: '#333',
};

const descStyle: React.CSSProperties = {
  color: '#666',
  marginBottom: '25px',
  fontSize: '0.95rem',
  lineHeight: '1.5',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#333',
  fontWeight: '500',
};

const inputStyle: React.CSSProperties = {
  padding: '12px 15px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '1rem',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.3s',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '100px',
};

const submitBtnStyle: React.CSSProperties = {
  backgroundColor: '#1a1a1a',
  color: '#fff',
  border: 'none',
  padding: '15px',
  fontSize: '1rem',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  marginTop: '10px',
  transition: 'background-color 0.3s',
};

const errorStyle: React.CSSProperties = {
  color: '#d32f2f',
  fontSize: '0.9rem',
  marginTop: '-10px',
};

const successContainerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '20px 0',
};

const successIconStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  backgroundColor: '#4caf50',
  color: 'white',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '30px',
  margin: '0 auto 20px',
};

const successTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading), serif',
  fontSize: '1.5rem',
  marginBottom: '15px',
  fontWeight: 'normal',
};

const successTextStyle: React.CSSProperties = {
  color: '#666',
  lineHeight: '1.6',
};
