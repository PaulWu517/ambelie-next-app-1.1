import { create } from 'zustand';
import { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  lastSyncTime: string | null;
  lastError?: string | null;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
  syncWithBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
}

// 统一后端地址读取，优先使用生产环境变量
const API_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://ambelie-backend-production.up.railway.app';

// 获取用户token的辅助函数
const getUserToken = async () => {
  console.log('🔍 [Cart Debug] Starting token retrieval via API...');
  
  try {
    const tokenResponse = await fetch('/api/auth/get-token', {
      method: 'GET',
      credentials: 'include',
    });
    
    console.log('🌐 [Cart Debug] Token API response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.log('❌ [Cart Debug] Token API request failed:', tokenResponse.statusText);
      return null;
    }
    
    const tokenData = await tokenResponse.json();
    console.log('📦 [Cart Debug] Token API response:', {
      success: tokenData.success,
      source: tokenData.source,
      hasToken: !!tokenData.token,
      tokenLength: tokenData.token ? tokenData.token.length : 0
    });
    
    if (tokenData.success && tokenData.token) {
      console.log('✅ [Cart Debug] Successfully retrieved token from API');
      return tokenData.token;
    } else {
      console.log('⚠️ [Cart Debug] No token available (guest mode)');
      return null;
    }
  } catch (error) {
    console.error('💥 [Cart Debug] Error fetching token from API:', error);
    return null;
  }
};

export const useCartStore = create<CartState>()(
  (set, get) => ({
      items: [],
      isLoading: false,
      lastError: null,
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
        
        // 尝试同步到后端，并用后端覆盖本地，确保后端为唯一数据源
        try {
          await get().syncWithBackend();
          await get().loadFromBackend();
        } catch (error) {
          console.warn('⚠️ [Cart Debug] Failed to sync/load cart from backend after add:', error);
          set({ lastError: `Add sync/load failed: ${error instanceof Error ? error.message : String(error)}` });
        }
      },
      
      removeFromCart: async (productId) => {
        // 先更新本地状态
        set((state) => ({
          items: state.items.filter((item) => item.id.toString() !== productId),
        }));

        // 然后调用后端删除接口，确保后端与本地一致
        try {
          const token = await getUserToken();
          if (!token) {
            console.warn('❌ [Cart Debug] No user token found, skipping backend removal');
          } else {
            const fullUrl = `${API_BASE_URL}/api/cart/remove/${productId}`;
            console.log('🌐 [Cart Debug] Remove API URL:', fullUrl);
            const response = await fetch(fullUrl, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              cache: 'no-store'
            });

            if (!response.ok) {
              const text = await response.text();
              console.warn('❌ [Cart Debug] Backend remove failed:', response.status, text);
              // 退化为同步整个购物车
              await get().syncWithBackend();
            }
          }
        } catch (error) {
          console.warn('💥 [Cart Debug] Failed to remove cart item from backend:', error);
          set({ lastError: `Remove failed: ${error instanceof Error ? error.message : String(error)}` });
          // 退化为同步整个购物车
          try { await get().syncWithBackend(); } catch {}
        }

        // 从后端重新加载，确保最终一致
        try {
          await get().loadFromBackend();
        } catch (error) {
          console.warn('⚠️ [Cart Debug] Failed to reload cart from backend:', error);
          set({ lastError: `Reload failed: ${error instanceof Error ? error.message : String(error)}` });
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
        
        // 尝试同步到后端，并用后端覆盖本地
        try {
          await get().syncWithBackend();
          await get().loadFromBackend();
        } catch (error) {
          console.warn('⚠️ [Cart Debug] Failed to sync/load cart from backend after update:', error);
          set({ lastError: `Update sync/load failed: ${error instanceof Error ? error.message : String(error)}` });
        }
      },
      
      clearCart: async () => {
        set({ items: [] });
        
        // 尝试同步到后端，并用后端覆盖本地
        try {
          await get().syncWithBackend();
          await get().loadFromBackend();
        } catch (error) {
          console.warn('⚠️ [Cart Debug] Failed to sync/load cart from backend after clear:', error);
          set({ lastError: `Clear sync/load failed: ${error instanceof Error ? error.message : String(error)}` });
        }
      },
      
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      syncWithBackend: async () => {
        console.log('🔄 [Cart Debug] Starting cart sync with backend...');
        
        const token = await getUserToken();
        console.log('🔑 [Cart Debug] Token status:', token ? 'available' : 'not available');
        
        if (!token) {
          console.log('❌ [Cart Debug] No token available, skipping sync');
          return;
        }
        
        const fullUrl = `${API_BASE_URL}/api/cart/sync`;
        console.log('🌐 [Cart Debug] Sync API URL:', fullUrl);
        
        set({ isLoading: true });
        
        try {
          const cartItems = get().items.map(item => ({
            productId: item.id.toString(),
            quantity: item.quantity,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          
          const requestBody = { cartItems };
          console.log('📦 [Cart Debug] Sync request body:', requestBody);
          
          const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
          });
          
          console.log('📡 [Cart Debug] Sync response status:', response.status);
          console.log('📡 [Cart Debug] Sync response headers:', Object.fromEntries(response.headers.entries()));
          
          const responseText = await response.text();
          console.log('📄 [Cart Debug] Sync response text:', responseText);
          
          if (response.status >= 200 && response.status < 300) {
            set({ lastSyncTime: new Date().toISOString() });
            console.log('✅ [Cart Debug] Successfully synced with backend');
          } else {
            console.log('❌ [Cart Debug] Sync failed with status:', response.status);
            set({ lastError: `Sync failed: ${response.status}` });
          }
        } catch (error) {
          console.error('💥 [Cart Debug] Sync error:', error);
          set({ lastError: `Sync error: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
          set({ isLoading: false });
          console.log('🏁 [Cart Debug] Sync process completed');
        }
      },
      
      loadFromBackend: async () => {
        console.log('🔄 [Cart Debug] Begin loadFromBackend, clearing local cache...');
        set({ items: [], isLoading: true, lastError: null });
        const token = await getUserToken();
        console.log('🔑 [Cart Debug] Token found for load:', !!token, token ? `Length: ${token.length}` : 'No token');
        if (!token) {
          console.warn('❌ [Cart Debug] No user token found, keeping empty cart');
          set({ isLoading: false, lastError: 'No token' });
          return;
        }

        try {
          // 从后端读取用户购物车
          const cartUrl = `${API_BASE_URL}/api/cart`;
          console.log('🌐 [Cart Debug] Fetch cart URL:', cartUrl);
          const response = await fetch(cartUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            cache: 'no-store'
          });

          console.log('📡 [Cart Debug] Cart load response status:', response.status);
          const rawText = await response.text();
          let result: any = null;
          try {
            result = rawText ? JSON.parse(rawText) : null;
          } catch (e) {
            console.warn('⚠️ [Cart Debug] Failed to parse cart JSON, using raw text');
          }
          console.log('📥 [Cart Debug] Raw response JSON:', result);
          if (response.ok && result) {

            // 兼容不同数据结构：data/items/cartItems
            const backendItemsRaw = (result?.data?.items || result?.data?.cartItems || result?.data || []);
            const backendItems: Array<{ productId: string | number; quantity: number }> = Array.isArray(backendItemsRaw)
              ? backendItemsRaw.map((i: any) => ({
                  productId: (i.productId ?? i.id),
                  quantity: Number(i.quantity ?? i.qty ?? 1),
                }))
              : [];

            console.log('🧾 [Cart Debug] Normalized backend items:', backendItems);
            if (!backendItems.length) {
              console.log('📭 [Cart Debug] No cart items from backend, keeping empty');
              set({ items: [], lastSyncTime: new Date().toISOString(), isLoading: false });
              return;
            }

            // 优先使用后端已填充的产品详情，避免二次 /api/products/:id 请求
            const populatedItemsRaw = Array.isArray(result?.data?.items) ? result.data.items : null;
            if (populatedItemsRaw && populatedItemsRaw.length) {
              console.log('✨ [Cart Debug] Using backend populated items to build cart');
              const detailedItems: CartItem[] = populatedItemsRaw.map((p: any) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                period: p.period,
                description: p.description,
                materials: p.materials,
                origin: p.origin,
                dimensions: p.dimensions,
                designer: p.designer,
                price: p.price,
                currencyKeyword: p.currencyKeyword,
                images: p.images,
                main_image: p.main_image,
                quantity: typeof p.quantity === 'number' ? p.quantity : 1,
              }));

              set({ items: detailedItems, lastSyncTime: new Date().toISOString(), isLoading: false });
              console.log('✅ [Cart Debug] Cart replaced using backend populated items. Count:', detailedItems.length);
              return;
            }

            // 为每个后端商品补齐详情，完全覆盖本地
            const detailedItems: CartItem[] = [];
            for (const b of backendItems) {
              try {
                const detailUrl = `${API_BASE_URL}/api/products/${b.productId}?populate[0]=images&populate[1]=main_image`;
                console.log('🔎 [Cart Debug] Fetch product detail:', detailUrl);
                const prodRes = await fetch(detailUrl, {
                  method: 'GET',
                  // 默认产品接口可能不识别网站用户令牌，移除 Authorization 头以避免 401
                  headers: {}
                });
                if (!prodRes.ok) {
                  const txt = await prodRes.text();
                  console.warn('❌ [Cart Debug] Product detail fetch failed:', b.productId, prodRes.status, txt);
                  continue;
                }
                const prodJson = await prodRes.json();
                const data = prodJson.data;
                const attr = data?.attributes || {};
                const item: CartItem = {
                  id: data?.id,
                  name: attr.name,
                  slug: attr.slug,
                  period: attr.period,
                  description: attr.description,
                  materials: attr.materials,
                  origin: attr.origin,
                  dimensions: attr.dimensions,
                  designer: attr.designer,
                  price: attr.price,
                  currencyKeyword: attr.currencyKeyword,
                  images: attr.images,
                  main_image: attr.main_image,
                  quantity: b.quantity
                };
                detailedItems.push(item);
              } catch (e) {
                console.warn('💥 [Cart Debug] Error during product detail fetch:', b.productId, e);
              }
            }

            set({ items: detailedItems, lastSyncTime: new Date().toISOString() });
            console.log('✅ [Cart Debug] Cart replaced from backend (full detail). Count:', detailedItems.length);
          } else {
            console.error('❌ [Cart Debug] Failed to load cart:', response.status, rawText);
            set({ items: [], lastError: `Load failed: ${response.status}` });
          }
        } catch (error) {
          console.error('💥 [Cart Debug] Cart load error:', error);
          set({ items: [], lastError: `Load error: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
          set({ isLoading: false });
          console.log('🏁 [Cart Debug] Load process completed');
        }
      }
    })
);