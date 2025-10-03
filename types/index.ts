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
  name: string;
  slug: string;
  period: string;
  description: string;
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
}

export interface CartItem extends Product {
  quantity: number;
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