'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

interface User {
  email: string;
  name: string | null;
}

export default function LoginForm() {
  const router = useRouter();
  
  // 状态管理
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const sendVerificationCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message);
        setStep('code');
        startCountdown();
        
        // Display verification code in development
        if (result.debug?.code) {
          console.log('Verification code:', result.debug.code);
        }
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Network error, please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  // 验证登录
  const verifyAndLogin = async () => {
    if (!code) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, name }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Login successful! Redirecting...');
        // 强制刷新页面以更新认证状态
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (error) {
      setError('Network error, please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown functionality
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 重新发送验证码
  const resendCode = () => {
    setCode('');
    setError('');
    sendVerificationCode();
  };

  // 返回邮箱输入步骤
  const backToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setMessage('');
  };

  return (
    <div className={styles.loginForm}>
      {/* 状态消息 */}
      {message && (
        <div className={`${styles.message} ${styles.success}`}>
          {message}
        </div>
      )}
      
      {error && (
        <div className={`${styles.message} ${styles.error}`}>
          {error}
        </div>
      )}

      {step === 'email' ? (
        // Email input step
        <div className={styles.emailStep}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={isLoading}
              onKeyPress={(e) => e.key === 'Enter' && sendVerificationCode()}
            />
          </div>

          <button
            type="button"
            onClick={sendVerificationCode}
            disabled={isLoading || !email}
            className={styles.submitButton}
          >
            {isLoading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      ) : (
        // Verification code input step
        <div className={styles.codeStep}>
          <div className={styles.emailDisplay}>
            Verification code sent to: <strong>{email}</strong>
            <button type="button" onClick={backToEmail} className={styles.changeEmail}>
              Change Email
            </button>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="code">Verification Code</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit verification code"
              disabled={isLoading}
              maxLength={6}
              onKeyPress={(e) => e.key === 'Enter' && verifyAndLogin()}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name">Name (Optional)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={isLoading}
            />
          </div>

          <button
            type="button"
            onClick={verifyAndLogin}
            disabled={isLoading || code.length !== 6}
            className={styles.submitButton}
          >
            {isLoading ? 'Verifying...' : 'Verify and Sign In'}
          </button>

          <div className={styles.resendSection}>
            {countdown > 0 ? (
              <span className={styles.countdown}>
                Resend available in {countdown} seconds
              </span>
            ) : (
              <button
                type="button"
                onClick={resendCode}
                className={styles.resendButton}
                disabled={isLoading}
              >
                Resend Verification Code
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}