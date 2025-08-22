'use client';

import React, { useState, useEffect } from 'react';
import { useCollectionStore } from '@/lib/stores/collectionStore';
import { useCartStore } from '@/lib/stores/cartStore';
import Image from 'next/image';

export default function DebugPage() {
  const { items: collectionItems, loadFromBackend } = useCollectionStore();
  const { items: cartItems } = useCartStore();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // 加载收藏夹数据
    loadFromBackend();
  }, [loadFromBackend]);

  const analyzeData = () => {
    const analysis = {
      collectionItems: collectionItems.map(item => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        hasMainImage: !!item.main_image,
        mainImageStructure: item.main_image ? {
          hasData: !!item.main_image.data,
          hasAttributes: !!item.main_image?.data?.attributes,
          hasUrl: !!item.main_image?.data?.attributes?.url,
          url: item.main_image?.data?.attributes?.url,
          urlType: item.main_image?.data?.attributes?.url?.startsWith('http') ? 'absolute' : 'relative'
        } : null,
        fullMainImageData: item.main_image
      })),
      cartItems: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        hasMainImage: !!item.main_image,
        mainImageStructure: item.main_image ? {
          hasData: !!item.main_image.data,
          hasAttributes: !!item.main_image?.data?.attributes,
          hasUrl: !!item.main_image?.data?.attributes?.url,
          url: item.main_image?.data?.attributes?.url,
          urlType: item.main_image?.data?.attributes?.url?.startsWith('http') ? 'absolute' : 'relative'
        } : null,
        fullMainImageData: item.main_image
      }))
    };
    
    setDebugInfo(analysis);
    console.log('🔍 Debug Analysis:', analysis);
  };

  const getImageUrl = (item: any) => {
    let imageUrl = '/placeholder.jpg';
    const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
    
    if (item.main_image) {
      // 检查是否是新的数据结构 (直接的图片对象)
      if (item.main_image.url) {
        imageUrl = item.main_image.url.startsWith('http') ? 
          item.main_image.url : 
          `${API_URL}${item.main_image.url}`;
      }
      // 检查是否是旧的数据结构 (包含data.attributes)
      else if (item.main_image.data?.attributes?.url) {
        imageUrl = item.main_image.data.attributes.url.startsWith('http') ? 
          item.main_image.data.attributes.url : 
          `${API_URL}${item.main_image.data.attributes.url}`;
      }
    }
    
    return imageUrl;
  };

  const testImageUrl = (url: string) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ url, status: 'success' });
      img.onerror = () => resolve({ url, status: 'error' });
      img.src = url;
    });
  };

  const testAllImages = async () => {
    const allUrls: string[] = [];
    
    // 收集所有图片URL
    collectionItems.forEach(item => {
      const url = getImageUrl(item);
      if (url !== '/placeholder.jpg') {
        allUrls.push(url);
      }
    });
    
    cartItems.forEach(item => {
      const url = getImageUrl(item);
      if (url !== '/placeholder.jpg') {
        allUrls.push(url);
      }
    });
    
    // 测试所有URL
    const results = await Promise.all(allUrls.map(testImageUrl));
    console.log('🖼️ Image URL Test Results:', results);
    alert(`测试完成！查看控制台获取详细结果。成功: ${results.filter(r => (r as any).status === 'success').length}, 失败: ${results.filter(r => (r as any).status === 'error').length}`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>数据结构调试页面</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={analyzeData} style={{ marginRight: '10px', padding: '10px 20px' }}>
          分析数据结构
        </button>
        <button onClick={testAllImages} style={{ padding: '10px 20px' }}>
          测试所有图片URL
        </button>
        <button onClick={() => loadFromBackend()} style={{ marginLeft: '10px', padding: '10px 20px' }}>
          重新加载收藏夹
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h2>收藏夹数据 ({collectionItems.length} 项)</h2>
          <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {collectionItems.map(item => (
              <div key={item.id} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee' }}>
                <h4>{item.name}</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '100px', height: '120px', border: '1px solid #ddd' }}>
                    {getImageUrl(item) !== '/placeholder.jpg' ? (
                      <Image
                        src={getImageUrl(item)}
                        alt={item.name}
                        width={100}
                        height={120}
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.jpg';
                        }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        无图片
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <p><strong>URL:</strong> {item.main_image?.data?.attributes?.url || '无'}</p>
                    <p><strong>类型:</strong> {item.main_image?.data?.attributes?.url?.startsWith('http') ? '绝对路径' : '相对路径'}</p>
                    <p><strong>数据结构:</strong> {item.main_image ? '完整' : '缺失'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2>购物车数据 ({cartItems.length} 项)</h2>
          <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {cartItems.map(item => (
              <div key={item.id} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee' }}>
                <h4>{item.name}</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '100px', height: '120px', border: '1px solid #ddd' }}>
                    {getImageUrl(item) !== '/placeholder.jpg' ? (
                      <Image
                        src={getImageUrl(item)}
                        alt={item.name}
                        width={100}
                        height={120}
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.jpg';
                        }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        无图片
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <p><strong>URL:</strong> {item.main_image?.data?.attributes?.url || '无'}</p>
                    <p><strong>类型:</strong> {item.main_image?.data?.attributes?.url?.startsWith('http') ? '绝对路径' : '相对路径'}</p>
                    <p><strong>数据结构:</strong> {item.main_image ? '完整' : '缺失'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {debugInfo && (
        <div style={{ marginTop: '20px' }}>
          <h2>详细分析结果</h2>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}