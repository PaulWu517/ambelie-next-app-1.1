'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import styles from './login.module.css';

interface User {
  email: string;
  name: string | null;
}

export default function LoginForm() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      
      console.log('=== Frontend Login Response Debug ===');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response data:', result);
      
      // 检查Set-Cookie头
      const setCookieHeader = response.headers.get('set-cookie');
      console.log('Set-Cookie header:', setCookieHeader);
      
      if (response.ok) {
        console.log('🎉 Login verification successful!');
        
        // 检查cookie是否被设置
        setTimeout(() => {
          console.log('🍪 Post-login cookie check:');
          console.log('document.cookie:', document.cookie);
          
          // 测试token获取
          fetch('/api/auth/get-token', { credentials: 'include' })
            .then(r => r.json())
            .then(tokenData => {
              console.log('🔑 Post-login token retrieval test:', tokenData);
            })
            .catch(err => console.error('❌ Token retrieval test failed:', err));
        }, 500);
        
        console.log('🔄 Starting auth refresh process...');
        // 立即刷新用户认证状态并跳转
        refreshAuth().then((result) => {
          console.log('✅ Auth refresh completed successfully:', result);
          console.log('🏠 Redirecting to homepage with a full page reload...');
          // 使用 window.location.assign() 来强制页面刷新，确保所有组件状态同步
          window.location.assign('/');
        }).catch((error) => {
          console.error('❌ Auth refresh failed:', error);
          console.log('🏠 Redirecting anyway with a full page reload...');
          // 即使刷新失败也跳转，因为登录已经成功
          window.location.assign('/');
        });
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
  };

  return (
    <div className={styles.loginForm}>
      <div className={styles.loginHeader}>
        <h1>SIGN IN</h1>
        {step === 'email' ? (
          <p>Enter your email address and we'll send you a verification code to sign in</p>
        ) : (
          <p>
            Verification code sent to: {email}
          </p>
        )}
      </div>

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