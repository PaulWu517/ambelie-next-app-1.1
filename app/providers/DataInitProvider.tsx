'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCollectionStore } from '@/lib/stores/collectionStore';
import { useInquiryStore } from '@/lib/stores/inquiryStore';

interface DataInitProviderProps {
  children: React.ReactNode;
}

export default function DataInitProvider({ children }: DataInitProviderProps) {
  const { isLoggedIn, isLoading } = useAuth();
  const { loadFromBackend: loadCollection } = useCollectionStore();
  const { loadFromBackend: loadInquiry } = useInquiryStore();

  useEffect(() => {
    // 只有在用户登录且认证状态加载完成后才初始化数据
    if (isLoading) {
      console.log('🔄 [DataInit] 等待认证状态加载...');
      return;
    }

    if (!isLoggedIn) {
      console.log('👤 [DataInit] 用户未登录，跳过数据初始化');
      return;
    }

    // 用户已登录，开始加载数据
    const initializeData = async () => {
      try {
        console.log('🚀 [DataInit] 用户已登录，开始初始化用户数据...');
        
        // 并行加载收藏和问询数据
        await Promise.all([
          loadCollection(),
          loadInquiry()
        ]);
        
        console.log('✅ [DataInit] 用户数据初始化完成');
      } catch (error) {
        console.error('❌ [DataInit] 数据初始化失败:', error);
      }
    };

    initializeData();
  }, [isLoggedIn, isLoading, loadCollection, loadInquiry]);

  return <>{children}</>;
}