import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';

interface InquiryItem extends Product {
  inquiryDate: string; // 加入询价清单的时间
}

interface InquiryState {
  items: InquiryItem[];
  isLoading: boolean;
  lastSyncTime: string | null;
  addToInquiry: (product: Product) => void;
  removeFromInquiry: (productId: string) => void;
  clearInquiry: () => void;
  getItemCount: () => number;
  isProductInInquiry: (productId: string) => boolean;
  syncWithBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  submitInquiry: (inquiryData: any) => Promise<boolean>;
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

export const useInquiryStore = create<InquiryState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      lastSyncTime: null,
      
      addToInquiry: async (product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);
          if (existingItem) {
            // 如果商品已存在，不重复添加，但更新时间
            const updatedItems = state.items.map((item) =>
              item.id === product.id 
                ? { ...item, inquiryDate: new Date().toISOString() } 
                : item
            );
            return { items: updatedItems };
          } else {
            // 如果商品不存在，则添加到询价清单
            const newItem: InquiryItem = { 
              ...product, 
              inquiryDate: new Date().toISOString() 
            };
            return { items: [...state.items, newItem] };
          }
        });
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync inquiry to backend:', error);
        }
      },
      
      removeFromInquiry: async (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync inquiry to backend:', error);
        }
      },
      
      clearInquiry: async () => {
        set({ items: [] });
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync inquiry to backend:', error);
        }
      },
      
      getItemCount: () => {
        return get().items.length;
      },
      
      isProductInInquiry: (productId) => {
        return get().items.some((item) => item.id === productId);
      },
      
      syncWithBackend: async () => {
        console.log('🔄 [Inquiry Sync] Starting sync with backend...');
        
        const token = await getUserToken();
        console.log('🔑 [Inquiry Sync] Token status:', token ? 'available' : 'not available');
        
        if (!token) {
          console.log('❌ [Inquiry Sync] No token available, skipping sync');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const fullUrl = `${apiUrl}/api/inquiries/sync`;
        console.log('🌐 [Inquiry Sync] API URL:', fullUrl);
        
        const inquiryItems = get().items.map(item => ({
          productId: item.id,
          inquiryDate: item.inquiryDate
        }));
        
        const requestBody = {
          inquiryItems: inquiryItems
        };
        console.log('📦 [Inquiry Sync] Request body:', requestBody);

        try {
          const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
          });
          
          console.log('📡 [Inquiry Sync] Response status:', response.status);
          console.log('📡 [Inquiry Sync] Response headers:', Object.fromEntries(response.headers.entries()));
          
          const responseText = await response.text();
          console.log('📄 [Inquiry Sync] Response text:', responseText);
          
          if (response.status >= 200 && response.status < 300) {
            console.log('✅ [Inquiry Sync] Successfully synced with backend');
          } else {
            console.log('❌ [Inquiry Sync] Sync failed with status:', response.status);
          }
        } catch (error) {
          console.error('💥 [Inquiry Sync] Sync error:', error);
        } finally {
          console.log('🏁 [Inquiry Sync] Sync process completed');
        }
      },
      
      loadFromBackend: async () => {
        const token = await getUserToken();
        if (!token) {
          console.warn('No user token found, skipping inquiry load');
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
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
              // 这里需要根据productId获取完整的产品信息
              // 暂时保持现有的本地数据，后续可以优化
              set({ 
                lastSyncTime: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('Inquiry load error:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      submitInquiry: async (inquiryData) => {
        const token = await getUserToken();
        if (!token) {
          console.warn('No user token found, cannot submit inquiry');
          return false;
        }
        
        set({ isLoading: true });
        
        try {
          const productIds = get().items.map(item => item.id);
          
          const response = await fetch(`${API_BASE_URL}/api/inquiries/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              ...inquiryData,
              productIds
            })
          });
          
          if (response.ok) {
            // 提交成功后清空询价列表
            set({ items: [], lastSyncTime: new Date().toISOString() });
            return true;
          } else {
            console.error('Failed to submit inquiry:', response.statusText);
            return false;
          }
        } catch (error) {
          console.error('Inquiry submit error:', error);
          return false;
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'inquiry-storage', // 用于本地存储的键
    }
  )
);