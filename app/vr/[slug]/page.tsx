import React from 'react';
import VRClient from './VRClient';

interface ProductResponse {
  // 后端返回的产品数据在根级字段，而不是 Strapi 的 attributes 包裹
  data: Array<{
    id: number;
    name: string;
    slug: string;
    vrModelUrl?: string;
    vrUsdzUrl?: string;
    main_image?: { url?: string; alternativeText?: string | null } | null;
  }>;
}

async function getProductBySlug(slug: string) {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  const url = `${API_URL}/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[0]=main_image`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const json: ProductResponse = await res.json();
  const item = json.data?.[0];
  if (!item) return null;
  const mainImageUrl = item.main_image?.url;
  const usdzUrl = item.vrUsdzUrl;
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    vrModelUrl: item.vrModelUrl,
    vrUsdzUrl: usdzUrl && (usdzUrl.startsWith('http') ? usdzUrl : `${API_URL}${usdzUrl}`),
    mainImageUrl: mainImageUrl && (mainImageUrl.startsWith('http') ? mainImageUrl : `${API_URL}${mainImageUrl}`)
  };
}

// Next.js 15+ 在部分情况下将 params 标记为异步（Promise）。
// 为避免 “params should be awaited before using its properties” 报错，这里改为等待 params。
export default async function VRPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return (
    <main style={{ padding: 0, margin: 0, background: '#f0f0f0' }}>
      <VRClient product={product} />
    </main>
  );
}