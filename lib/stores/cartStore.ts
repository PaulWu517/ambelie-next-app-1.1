import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  lastSyncTime: string | null;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
  syncWithBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';

// 获取用户token的辅助函数
const getUserToken = async () => {
  console.log('🔍 [Token Debug] Starting token retrieval via API...');
  
  try {
    const tokenResponse = await fetch('/api/auth/get-token', {
      method: 'GET',
      credentials: 'include',
    });
    
    console.log('🌐 [Token Debug] Token API response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.log('❌ [Token Debug] Token API request failed:', tokenResponse.statusText);
      return null;
    }
    
    const tokenData = await tokenResponse.json();
    console.log('📦 [Token Debug] Token API response:', {
      success: tokenData.success,
      source: tokenData.source,
      hasToken: !!tokenData.token,
      tokenLength: tokenData.token ? tokenData.token.length : 0
    });
    
    if (tokenData.success && tokenData.token) {
      console.log('✅ [Token Debug] Successfully retrieved token from API');
      return tokenData.token;
    } else {
      console.log('⚠️ [Token Debug] No token available (guest mode)');
      return null;
    }
  } catch (error) {
    console.error('💥 [Token Debug] Error fetching token from API:', error);
    return null;
  }
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      lastSyncTime: null,
      
      addToCart: async (product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id.toString() === product.id.toString());
          if (existingItem) {
            // 如果商品已存在，则数量加一
            const updatedItems = state.items.map((item) =>
              item.id.toString() === product.id.toString() ? { ...item, quantity: item.quantity + 1 } : item
            );
            return { items: updatedItems };
          } else {
            // 如果商品不存在，则添加到购物车
            const newItem: CartItem = { ...product, quantity: 1 };
            return { items: [...state.items, newItem] };
          }
        });
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync cart to backend:', error);
        }
      },
      
      removeFromCart: async (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id.toString() !== productId),
        }));
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync cart to backend:', error);
        }
      },
      
      updateQuantity: async (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            // 如果数量小于等于0，则移除商品
            return {
              items: state.items.filter((item) => item.id.toString() !== productId),
            };
          }
          const updatedItems = state.items.map((item) =>
            item.id.toString() === productId ? { ...item, quantity } : item
          );
          return { items: updatedItems };
        });
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync cart to backend:', error);
        }
      },
      
      clearCart: async () => {
        set({ items: [] });
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync cart to backend:', error);
        }
      },
      
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      syncWithBackend: async () => {
        console.log('🔄 [Cart Sync] Starting sync with backend...');
        
        const token = await getUserToken();
        console.log('🔑 [Cart Sync] Token status:', token ? 'available' : 'not available');
        
        if (!token) {
          console.log('❌ [Cart Sync] No token available, skipping sync');
          return;
        }
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const fullUrl = `${apiUrl}/api/cart/sync`;
        console.log('🌐 [Cart Sync] API URL:', fullUrl);
        
        set({ isLoading: true });
        
        try {
          const cartItems = get().items.map(item => ({
            productId: item.id.toString(),
            quantity: item.quantity,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          
          const requestBody = { cartItems };
          console.log('📦 [Cart Sync] Request body:', requestBody);
          
          const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
          });
          
          console.log('📡 [Cart Sync] Response status:', response.status);
          console.log('📡 [Cart Sync] Response headers:', Object.fromEntries(response.headers.entries()));
          
          const responseText = await response.text();
          console.log('📄 [Cart Sync] Response text:', responseText);
          
          if (response.status >= 200 && response.status < 300) {
            set({ lastSyncTime: new Date().toISOString() });
            console.log('✅ [Cart Sync] Successfully synced with backend');
          } else {
            console.log('❌ [Cart Sync] Sync failed with status:', response.status);
          }
        } catch (error) {
          console.error('💥 [Cart Sync] Sync error:', error);
        } finally {
          set({ isLoading: false });
          console.log('🏁 [Cart Sync] Sync process completed');
        }
      },
      
      loadFromBackend: async () => {
        const token = await getUserToken();
        if (!token) {
          console.warn('No user token found, skipping cart load');
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              // 将后端数据转换为前端格式
              const backendItems = result.data;
              const frontendItems: CartItem[] = [];
              
              // 这里需要根据productId获取完整的产品信息
              // 暂时保持现有的本地数据，后续可以优化
              set({ 
                lastSyncTime: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('Cart load error:', error);
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'cart-storage', // 用于本地存储的键
    }
  )
);