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
    console.log('🔍 checkAuthStatus: Starting API call to /api/auth/me');
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      
      console.log('🔍 checkAuthStatus: API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 checkAuthStatus: User data received:', data);
        console.log('🔍 checkAuthStatus: Setting auth state to logged in');
        setAuthState({
          user: data.user,
          isLoggedIn: true,
          isLoading: false,
        });
        console.log('🔍 checkAuthStatus: Auth state updated successfully');
        return data.user;
      } else {
        console.log('🔍 checkAuthStatus: User not authenticated, setting logged out state');
        setAuthState({
          user: null,
          isLoggedIn: false,
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      console.error('❌ checkAuthStatus: Auth check failed:', error);
      setAuthState({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
      return null;
    }
  };

  // 登出函数
  const logout = async () => {
    try {
      // 调用后端logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Backend logout failed:', error);
    }
    
    // 清除前端cookies
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'website-user-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'ambelie-session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
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

  // 刷新认证状态
  const refreshAuth = async () => {
    console.log('🔄 refreshAuth: Starting auth status check...');
    const result = await checkAuthStatus();
    console.log('🔄 refreshAuth: Auth status check completed, result:', result);
    return result;
  };

  return {
    ...authState,
    checkAuthStatus,
    logout,
    refreshAuth,
  };
};