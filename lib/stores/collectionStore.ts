import { create } from 'zustand';
import { Product } from '@/types';

interface CollectionState {
  items: Product[];
  isLoading: boolean;
  lastSyncTime: string | null;
  addToCollection: (product: Product) => void;
  removeFromCollection: (productSlug: string) => void;
  isInCollection: (productSlug: string) => boolean;
  clearCollection: () => void;
  getCollectionCount: () => number;
  syncWithBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
}

const API_BASE_URL = 'https://ambelie-backend-production.up.railway.app';

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

export const useCollectionStore = create<CollectionState>()((set, get) => ({
    items: [],
    isLoading: false,
    lastSyncTime: null,
    
    addToCollection: async (product: Product) => {
      const { items } = get();
      const existingItem = items.find(item => item.id === product.id);
      
      if (!existingItem) {
        set({ items: [...items, product] });
        
        // 尝试同步到后端
        try {
          await get().syncWithBackend();
        } catch (error) {
          console.warn('Failed to sync collection to backend:', error);
        }
      }
    },
    
    removeFromCollection: async (productSlug: string) => {
      set(state => ({
        items: state.items.filter(item => item.slug !== productSlug)
      }));
      
      // 尝试同步到后端
      try {
        await get().syncWithBackend();
      } catch (error) {
        console.warn('Failed to sync collection to backend:', error);
      }
    },
    
    isInCollection: (productSlug: string) => {
      const { items } = get();
      return items.some(item => item.slug === productSlug);
    },
    
    clearCollection: async () => {
      set({ items: [] });
      
      // 尝试同步到后端
      try {
        await get().syncWithBackend();
      } catch (error) {
        console.warn('Failed to sync collection to backend:', error);
      }
    },
    
    getCollectionCount: () => {
      const { items } = get();
      return items.length;
    },
    
    syncWithBackend: async () => {
      console.log('🔄 [Collection Debug] Starting sync to backend...');
      
      const token = await getUserToken();
      console.log('🔑 [Collection Debug] Token found:', !!token, token ? `Length: ${token.length}` : 'No token');
      
      if (!token) {
        console.warn('❌ [Collection Debug] No user token found, skipping collection sync');
        return;
      }
      
      set({ isLoading: true });
      
      try {
        const productSlugs = get().items.map(item => item.slug);
        console.log('📦 [Collection Debug] Product slugs to sync:', productSlugs);
        
        const apiUrl = `${API_BASE_URL}/api/wishlist/sync`;
        console.log('🌐 [Collection Debug] API URL:', apiUrl);
        
        const requestBody = { productSlugs };
        console.log('📋 [Collection Debug] Request body:', requestBody);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('� [Collection Debug] Response status:', response.status);
        console.log('� [Collection Debug] Response ok:', response.ok);
        
        const responseText = await response.text();
        console.log('� [Collection Debug] Response text:', responseText);
        
        if (response.ok) {
          set({ lastSyncTime: new Date().toISOString() });
          console.log('✅ [Collection Debug] Sync successful!');
        } else {
          console.error('❌ [Collection Debug] Failed to sync collection:', response.status, responseText);
        }
      } catch (error) {
        console.error('💥 [Collection Debug] Collection sync error:', error);
      } finally {
        set({ isLoading: false });
        console.log('🏁 [Collection Debug] Sync process completed');
      }
    },
    
    loadFromBackend: async () => {
      console.log('🔄 [Collection Debug] Loading collection from backend, clearing cache...');
      
      // 首先清空本地数据，确保不依赖缓存
      set({ items: [], isLoading: true });
      
      const token = await getUserToken();
      if (!token) {
        console.warn('❌ [Collection Debug] No user token found, keeping empty collection');
        set({ isLoading: false });
        return;
      }
      
      try {
        console.log('📡 [Collection Debug] Fetching collection from backend...');
        const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('📡 [Collection Debug] Backend response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📄 [Collection Debug] Backend response data:', result);
          
          if (result.success && result.data) {
            // 将后端数据设置为前端收藏列表
            const backendItems = result.data;
            console.log('📦 [Collection Debug] Setting collection items:', backendItems.length, 'items');
            set({ 
              items: backendItems,
              lastSyncTime: new Date().toISOString()
            });
          } else {
            console.log('📭 [Collection Debug] No collection data from backend, keeping empty');
            set({ items: [] });
          }
        } else {
          console.error('❌ [Collection Debug] Failed to load collection:', response.status);
          set({ items: [] });
        }
      } catch (error) {
        console.error('💥 [Collection Debug] Collection load error:', error);
        set({ items: [] });
      } finally {
        set({ isLoading: false });
        console.log('🏁 [Collection Debug] Collection load completed');
      }
    }
  }));