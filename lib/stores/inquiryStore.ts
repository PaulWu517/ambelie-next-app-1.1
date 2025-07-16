import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';

interface InquiryItem extends Product {
  inquiryDate: string; // 加入询价清单的时间
}

interface InquiryState {
  items: InquiryItem[];
  addToInquiry: (product: Product) => void;
  removeFromInquiry: (productId: string) => void;
  clearInquiry: () => void;
  getItemCount: () => number;
  isProductInInquiry: (productId: string) => boolean;
}

export const useInquiryStore = create<InquiryState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addToInquiry: (product) => {
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
      },
      
      removeFromInquiry: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },
      
      clearInquiry: () => {
        set({ items: [] });
      },
      
      getItemCount: () => {
        return get().items.length;
      },
      
      isProductInInquiry: (productId) => {
        return get().items.some((item) => item.id === productId);
      }
    }),
    {
      name: 'inquiry-storage', // 用于本地存储的键
    }
  )
); 