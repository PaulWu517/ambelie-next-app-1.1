'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

const AuthDebugPage = () => {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    // 收集调试信息
    const collectDebugInfo = () => {
      // 检查是否在客户端环境
      if (typeof window === 'undefined') {
        return;
      }

      const info = {
        // 环境变量
        environment: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        },
        // Cookies
        cookies: {
          all: document.cookie,
          websiteUserToken: getCookie('website-user-token'),
          ambelieSession: getCookie('ambelie-session'),
          authToken: getCookie('auth-token'),
        },
        // LocalStorage
        localStorage: {
          userEmail: localStorage.getItem('userEmail'),
          customerEmail: localStorage.getItem('customerEmail'),
          user: localStorage.getItem('user'),
        },
        // Auth State
        authState: {
          user,
          isLoggedIn,
          isLoading,
        },
        // URL Info
        urlInfo: {
          currentUrl: window.location.href,
          origin: window.location.origin,
        }
      };
      setDebugInfo(info);
    };

    collectDebugInfo();
  }, [user, isLoggedIn, isLoading]);

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') {
      return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const testApiEndpoint = async (endpoint: string, method: string = 'GET') => {
    try {
      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: parsedData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const runTests = async () => {
    setTestResults({ loading: true });
    
    const tests = {
      getToken: await testApiEndpoint('/api/auth/get-token'),
      authMe: await testApiEndpoint('/api/auth/me'),
      nextAuthSession: await testApiEndpoint('/api/auth/session'),
      sendCode: await testApiEndpoint('/api/auth/send-code', 'POST'),
    };

    setTestResults(tests);
  };

  const clearAllAuth = () => {
    if (typeof window === 'undefined') {
      return;
    }
    
    // 清除所有认证相关数据
    document.cookie = 'website-user-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'ambelie-session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    localStorage.clear();
    sessionStorage.clear();
    
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>认证系统调试页面</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          运行 API 测试
        </button>
        
        <button 
          onClick={clearAllAuth}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          清除所有认证数据
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h2>调试信息</h2>
          <pre style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div>
          <h2>API 测试结果</h2>
          <pre style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>快速诊断</h2>
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
          <p><strong>认证状态:</strong> {isLoggedIn ? '已登录' : '未登录'}</p>
          <p><strong>加载状态:</strong> {isLoading ? '加载中' : '已完成'}</p>
          <p><strong>用户信息:</strong> {user ? `${user.email} (${user.name})` : '无'}</p>
          <p><strong>Website Token:</strong> {typeof window !== 'undefined' && getCookie('website-user-token') ? '存在' : '不存在'}</p>
          <p><strong>Session:</strong> {typeof window !== 'undefined' && getCookie('ambelie-session') ? '存在' : '不存在'}</p>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>常见问题排查</h2>
        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '4px' }}>
          <h3>如果 /api/auth/get-token 返回 404:</h3>
          <ul>
            <li>检查 NextAuth 配置是否正确</li>
            <li>确认环境变量 NEXTAUTH_URL 设置正确</li>
            <li>验证 [...nextauth]/route.ts 文件是否存在</li>
          </ul>
          
          <h3>如果没有 token:</h3>
          <ul>
            <li>检查用户是否已登录</li>
            <li>确认 cookie 设置是否正确</li>
            <li>验证后端认证接口是否正常</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugPage;