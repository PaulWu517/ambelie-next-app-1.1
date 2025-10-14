'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCollectionStore } from '@/lib/stores/collectionStore';
import { useInquiryStore } from '@/lib/stores/inquiryStore';
import { useCartStore } from '@/lib/stores/cartStore';

interface DataInitProviderProps {
  children: React.ReactNode;
}

export default function DataInitProvider({ children }: DataInitProviderProps) {
  const { isLoggedIn, isLoading } = useAuth();
  const { loadFromBackend: loadCollection } = useCollectionStore();
  const { loadFromBackend: loadInquiry } = useInquiryStore();
  const { loadFromBackend: loadCart } = useCartStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    // 只有在用户登录且认证状态加载完成后才初始化数据
    if (isLoading) {
      console.log('🔄 [DataInit] 等待认证状态加载...');
      return;
    }

    if (!isLoggedIn) {
      console.log('👤 [DataInit] 用户未登录，跳过数据初始化');
      initializedRef.current = false; // 登出时允许下次登录重新初始化
      return;
    }

    if (initializedRef.current) {
      // 避免因依赖或函数引用变化造成的重复初始化
      return;
    }

    // 用户已登录，开始加载数据
    const initializeData = async () => {
      console.log('🚀 [DataInit] 用户已登录，开始初始化用户数据...');

      const tasks = [
        { name: 'collection', fn: loadCollection },
        { name: 'inquiry', fn: loadInquiry },
        { name: 'cart', fn: loadCart }
      ];

      const results = await Promise.allSettled(tasks.map(t => t.fn()));

      results.forEach((res, idx) => {
        const name = tasks[idx].name;
        if (res.status === 'fulfilled') {
          console.log(`✅ [DataInit] ${name} 初始化完成`);
        } else {
          console.error(`❌ [DataInit] ${name} 初始化失败:`, res.reason);
        }
      });

      const allOk = results.every(r => r.status === 'fulfilled');
      if (allOk) {
        console.log('✅ [DataInit] 用户数据初始化全部完成');
        initializedRef.current = true;
      } else {
        console.warn('⚠️ [DataInit] 部分模块初始化失败，已记录详细错误');
        // 即使部分失败也不抛出顶层错误，避免阻塞页面渲染
      }
    };

    initializeData();
  }, [isLoggedIn, isLoading]);

  return <>{children}</>;
}