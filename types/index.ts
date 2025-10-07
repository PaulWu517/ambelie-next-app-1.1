export interface Image {
  id: number;
  attributes: {
    name: string;
    alternativeText: string | null;
    caption: string | null;
    width: number;
    height: number;
    formats: any;
    hash: string;
    ext: string;
    mime: string;
    size: number;
    url: string;
    previewUrl: string | null;
    provider: string;
    provider_metadata: any;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Product {
  id: number;
  name?: string;
  slug?: string;
  period?: string;
  description?: string;
  materials?: string;
  origin?: string;
  dimensions?: string;
  designer?: string;
  price?: number; // 商品价格
  currencyKeyword?: string; // 货币关键字（如 GBP, USD 等）
  isInquiryOnly?: boolean; // 是否仅支持询价
  images?: { data: Image[] };
  main_image?: { data: Image };
  hover_image?: { data: Image };
  vrModelUrl?: string; // VR 模型地址（COS GLB 文件 URL）
}

// 说明：不再继承 Partial<Product>，以避免 id 类型与 Partial<Product> 的兼容性报错
export interface CartItem {
  id: number | string;
  quantity: number;
  // 以下字段均为可选，用于前端展示，不强依赖后端完整结构
  name?: string;
  slug?: string;
  period?: string;
  description?: string;
  materials?: string;
  origin?: string;
  dimensions?: string;
  designer?: string;
  price?: number;
  currencyKeyword?: string;
  images?: { data: Image[] };
  main_image?: { data: Image };
  hover_image?: { data: Image };
  vrModelUrl?: string;
}

export interface Exhibition {
  id: number;
  attributes: {
    name: string;
    slug: string;
    exhibitionType: string;
    exhibitionStatus: 'current' | 'past';
    startDate: string;
    endDate: string;
    introduction?: string;
    description?: string;
    location?: string;
    showOnHomepage: boolean;
    mainImage: { data: Image };
    images?: { data: Image[] };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}