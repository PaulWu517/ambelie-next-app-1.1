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
  removeFromInquiry: (productSlug: string) => void;
  clearInquiry: () => void;
  getItemCount: () => number;
  isProductInInquiry: (productSlug: string) => boolean;
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
        console.log('➕ [Inquiry Debug] Adding product to inquiry:', product.slug);
        
        set((state) => {
          const existingItem = state.items.find((item) => item.slug === product.slug);
          if (existingItem) {
            console.log('🔄 [Inquiry Debug] Product already exists, updating timestamp');
            // 如果商品已存在，不重复添加，但更新时间
            const updatedItems = state.items.map((item) =>
              item.slug === product.slug 
                ? { ...item, inquiryDate: new Date().toISOString() } 
                : item
            );
            return { items: updatedItems };
          } else {
            console.log('✨ [Inquiry Debug] Adding new product to inquiry list');
            // 如果商品不存在，则添加到询价清单
            const newItem: InquiryItem = { 
              ...product, 
              inquiryDate: new Date().toISOString() 
            };
            return { items: [...state.items, newItem] };
          }
        });
        
        console.log('📊 [Inquiry Debug] Current inquiry items count:', get().items.length);
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('⚠️ [Inquiry Debug] Failed to sync inquiry to backend:', error);
        }
      },
      
      removeFromInquiry: async (productSlug) => {
        console.log('➖ [Inquiry Debug] Removing product from inquiry:', productSlug);
        
        set((state) => ({
          items: state.items.filter((item) => item.slug !== productSlug),
        }));
        
        console.log('📊 [Inquiry Debug] Current inquiry items count after removal:', get().items.length);
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('⚠️ [Inquiry Debug] Failed to sync inquiry to backend:', error);
        }
      },
      
      clearInquiry: async () => {
        console.log('🗑️ [Inquiry Debug] Clearing all inquiry items');
        
        set({ items: [] });
        
        console.log('📊 [Inquiry Debug] Inquiry list cleared, count:', get().items.length);
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('⚠️ [Inquiry Debug] Failed to sync inquiry to backend:', error);
        }
      },
      
      getItemCount: () => {
        return get().items.length;
      },
      
      isProductInInquiry: (productSlug) => {
        return get().items.some((item) => item.slug === productSlug);
      },
      
      syncWithBackend: async () => {
        console.log('🔄 [Inquiry Debug] Starting sync to backend...');
        
        const token = await getUserToken();
        console.log('🔑 [Inquiry Debug] Token found:', !!token, token ? `Length: ${token.length}` : 'No token');
        
        if (!token) {
          console.warn('❌ [Inquiry Debug] No user token found, skipping inquiry sync');
          return;
        }

        set({ isLoading: true });
        
        try {
          const inquirySlugs = get().items.map(item => item.slug);
          console.log('📦 [Inquiry Debug] Inquiry slugs to sync:', inquirySlugs);
          
          const apiUrl = `${API_BASE_URL}/api/inquiries/sync`;
          console.log('🌐 [Inquiry Debug] API URL:', apiUrl);
          
          const requestBody = { inquirySlugs };
          console.log('📋 [Inquiry Debug] Request body:', requestBody);

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
          });
          
          console.log('📡 [Inquiry Debug] Response status:', response.status);
          console.log('📡 [Inquiry Debug] Response ok:', response.ok);
          
          const responseText = await response.text();
          console.log('📄 [Inquiry Debug] Response text:', responseText);
          
          if (response.ok) {
            set({ lastSyncTime: new Date().toISOString() });
            console.log('✅ [Inquiry Debug] Sync successful!');
          } else {
            console.error('❌ [Inquiry Debug] Failed to sync inquiry:', response.status, responseText);
          }
        } catch (error) {
          console.error('💥 [Inquiry Debug] Inquiry sync error:', error);
        } finally {
          set({ isLoading: false });
          console.log('🏁 [Inquiry Debug] Sync process completed');
        }
      },
      
      loadFromBackend: async () => {
        console.log('📥 [Inquiry Debug] Starting load from backend...');
        
        const token = await getUserToken();
        console.log('🔑 [Inquiry Debug] Token found for load:', !!token, token ? `Length: ${token.length}` : 'No token');
        
        if (!token) {
          console.warn('❌ [Inquiry Debug] No user token found, skipping inquiry load');
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const apiUrl = `${API_BASE_URL}/api/inquiries`;
          console.log('🌐 [Inquiry Debug] Load API URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('📡 [Inquiry Debug] Load response status:', response.status);
          console.log('📡 [Inquiry Debug] Load response ok:', response.ok);
          
          if (response.ok) {
            const result = await response.json();
            console.log('📄 [Inquiry Debug] Load response data:', result);
            
            if (result.success && result.data) {
              // 将后端数据设置为前端问询列表
              const backendItems = result.data;
              console.log('📦 [Inquiry Debug] Backend items received:', backendItems);
              
              // 将后端产品数据转换为前端格式，添加 inquiryDate
              const inquiryItems = backendItems.map((product: Product) => ({
                ...product,
                inquiryDate: new Date().toISOString() // 使用当前时间作为询价时间
              }));
              
              console.log('🔄 [Inquiry Debug] Converted inquiry items:', inquiryItems);
              
              set({ 
                items: inquiryItems,
                lastSyncTime: new Date().toISOString()
              });
              
              console.log('✅ [Inquiry Debug] Successfully loaded inquiry items from backend');
            } else {
              console.log('⚠️ [Inquiry Debug] No data in response or unsuccessful response');
            }
          } else {
            const errorText = await response.text();
            console.error('❌ [Inquiry Debug] Failed to load inquiry items:', response.status, errorText);
          }
        } catch (error) {
          console.error('💥 [Inquiry Debug] Inquiry load error:', error);
        } finally {
          set({ isLoading: false });
          console.log('🏁 [Inquiry Debug] Load process completed');
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