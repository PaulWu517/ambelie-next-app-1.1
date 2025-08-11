'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './contact.module.css';

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    enquiryType: '',
    email: '',
    name: '',
    country: '',
    message: '',
    hearAboutUs: '',
    agree: false
  });

  // 从URL参数中获取邮件地址
  useEffect(() => {
    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) {
      setFormData(prev => ({
        ...prev,
        email: emailFromUrl
      }));
    }
  }, [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必填字段
    if (!formData.enquiryType || !formData.email || !formData.name || !formData.country || !formData.message) {
      setSubmitStatus('error');
      setStatusMessage('Please fill in all required fields');
      return;
    }

    if (!formData.agree) {
      setSubmitStatus('error');
      setStatusMessage('Please agree to the privacy policy');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setStatusMessage(result.message);
        // 重置表单
        setFormData({
          enquiryType: '',
          email: '',
          name: '',
          country: '',
          message: '',
          hearAboutUs: '',
          agree: false
        });
      } else {
        setSubmitStatus('error');
        setStatusMessage(result.error || 'Sending failed, please try again later');
      }
    } catch (error) {
      setSubmitStatus('error');
      setStatusMessage('Network error, please try again later');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-form-container" style={{ flex: '0 0 55%' }}>
      <h2 className="contact-form-title">Contact Us</h2>
      
      {/* 状态消息显示 */}
      {submitStatus !== 'idle' && (
        <div className={`${styles.statusMessage} ${submitStatus === 'success' ? styles.success : styles.error}`}>
          {statusMessage}
        </div>
      )}
      
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="enquiryType">Enquiry type<span className="required">*</span></label>
            <div className="select-wrapper">
              <select 
                id="enquiryType" 
                name="enquiryType" 
                value={formData.enquiryType}
                onChange={handleInputChange}
                onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Please select an enquiry type')}
                onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                required
              >
                <option value="">Please select</option>
                <option value="general">General Inquiry</option>
                <option value="products">Product Information</option>
                <option value="custom">Custom Orders</option>
                <option value="collaboration">Business Collaboration</option>
                <option value="press">Press & Media</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email address<span className="required">*</span></label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email}
              onChange={handleInputChange}
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.validity.valueMissing) {
                  target.setCustomValidity('Please enter your email address');
                } else if (target.validity.typeMismatch) {
                  target.setCustomValidity('Please enter a valid email address');
                }
              }}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              required 
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Name<span className="required">*</span></label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={formData.name}
              onChange={handleInputChange}
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Please enter your name')}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="country">Country/Location<span className="required">*</span></label>
            <div className="select-wrapper">
              <select 
                id="country" 
                name="country" 
                value={formData.country}
                onChange={handleInputChange}
                onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Please select a country/location')}
                onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                required
              >
                <option value="">Please select</option>
                <option value="china">China</option>
                <option value="japan">Japan</option>
                <option value="korea">South Korea</option>
                <option value="singapore">Singapore</option>
                <option value="usa">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="france">France</option>
                <option value="italy">Italy</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
        <div className="form-group full-width">
          <label htmlFor="message">Message<span className="required">*</span></label>
          <textarea 
            id="message" 
            name="message" 
            rows={6} 
            value={formData.message}
            onChange={handleInputChange}
            onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('Please enter your message')}
            onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
            required
          ></textarea>
        </div>
        <div className="form-group full-width">
          <label htmlFor="hearAboutUs">How did you hear about us?</label>
          <div className="select-wrapper">
            <select 
              id="hearAboutUs" 
              name="hearAboutUs"
              value={formData.hearAboutUs}
              onChange={handleInputChange}
            >
              <option value="">Please select</option>
              <option value="search">Search Engine</option>
              <option value="social">Social Media</option>
              <option value="friend">Friend or Colleague</option>
              <option value="magazine">Magazine or Publication</option>
              <option value="event">Exhibition or Event</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <p className="form-note">* Required field</p>
        <div className="privacy-policy">
          <p>By submitting this form you are confirming you are happy for us to pass on your details, where necessary, to Partners/Agents of Porta Romana for the strict purpose of allowing us to complete your request. We will never pass your details on to any third parties for marketing or any other purpose.</p>
          <p>All details provided by you are in accordance with our <Link href="/privacy-policy">Privacy Policy</Link></p>
          <div className="checkbox-wrapper">
            <input 
              type="checkbox" 
              id="agree" 
              name="agree" 
              checked={formData.agree}
              onChange={handleInputChange}
              required 
            />
            <label htmlFor="agree">I Agree</label>
          </div>
        </div>
        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'SENDING...' : 'SEND'}
        </button>
      </form>
    </div>
  );
}