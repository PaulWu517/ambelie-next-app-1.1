import { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
  });

  // 检查用户认证状态
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          isLoggedIn: true,
          isLoading: false,
        });
        return data.user;
      } else {
        setAuthState({
          user: null,
          isLoggedIn: false,
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
      return null;
    }
  };

  // 登出函数
  const logout = () => {
    // 清除cookies
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'website-user-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // 清除localStorage
    localStorage.removeItem('userEmail');
    localStorage.removeItem('customerEmail');
    localStorage.removeItem('user');
    
    // 更新状态
    setAuthState({
      user: null,
      isLoggedIn: false,
      isLoading: false,
    });
  };

  // 页面加载时检查认证状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    ...authState,
    checkAuthStatus,
    logout,
    refreshAuth: checkAuthStatus,
  };
}; 