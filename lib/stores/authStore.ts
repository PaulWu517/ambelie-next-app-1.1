import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,

      login: async (email: string, password: string) => {
        try {
          // TODO: 实际的登录API调用
          // 目前使用模拟数据
          const mockUser: User = {
            id: '1',
            email,
            username: email.split('@')[0],
            firstName: 'John',
            lastName: 'Doe',
            avatar: '/assets/default-avatar.png'
          };
          const mockToken = 'mock-jwt-token';
          
          set({ 
            user: mockUser, 
            isAuthenticated: true, 
            token: mockToken 
          });
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false, 
          token: null 
        });
      },

      setUser: (user: User, token: string) => {
        set({ 
          user, 
          isAuthenticated: true, 
          token 
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthState) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        token: state.token 
      }),
    }
  )
); 