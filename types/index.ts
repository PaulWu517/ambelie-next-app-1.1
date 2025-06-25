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
  id: string;
  name: string;
  period: string;
  description: string;
  materials?: string;
  origin?: string;
  dimensions?: string;
  price?: number; // 商品价格
  isInquiryOnly?: boolean; // 是否仅支持询价
  slug: string;
  images?: { data: Image[] };
  main_image?: { data: Image };
  hover_image?: { data: Image };
}

export interface CartItem extends Product {
  quantity: number;
} 