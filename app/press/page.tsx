import Image from 'next/image';
import Link from 'next/link';
import ScrollAnimations from '../../components/ScrollAnimations';

// Define the types needed for data fetching
interface ImageFormat {
  url: string;
  width: number;
  height: number;
  size: number;
}

interface ImageItem {
  url: string;
  alternativeText?: string | null;
  formats?: {
    large?: ImageFormat;
    medium?: ImageFormat;
    small?: ImageFormat;
    xlarge?: ImageFormat;
  };
}

interface PressItem {
  id: number;
  name: string;
  slug: string;
  projectType?: string;
  date?: string;
  introduction?: string;
  content?: string | null;
  mainImage?: ImageItem | null;
  showOnHomepage?: boolean;
  location?: string;
}

interface StrapiResponse {
  data: PressItem[];
}

// Function to fetch all press items
async function getPressItems(): Promise<PressItem[]> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  try {
    const res = await fetch(
      `${API_URL}/api/press-items?populate=*&sort=date:desc`, 
      {
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch press items`);
    }
    const json: StrapiResponse = await res.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching press items:`, error);
    return [];
  }
}

// Helper function to format date display
function formatDateDisplay(pressItem: PressItem): string {
  if (!pressItem.date) return '';
  
  const date = new Date(pressItem.date);
  
  const formatOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', formatOptions);
}

// Helper function to format date and location display
function formatDateLocationDisplay(pressItem: PressItem): string {
  const dateStr = formatDateDisplay(pressItem);
  const locationStr = pressItem.location || '';
  
  if (dateStr && locationStr) {
    return `${dateStr} • ${locationStr}`;
  } else if (dateStr) {
    return dateStr;
  } else if (locationStr) {
    return locationStr;
  }
  
  return '';
}

// Helper function to get introduction text
function getIntroductionText(pressItem: PressItem): string {
  // 首先尝试使用introduction字段
  if (pressItem.introduction && pressItem.introduction.trim()) {
    return pressItem.introduction;
  }
  
  // 如果introduction为空，尝试从content中提取文本
  if (pressItem.content) {
    // 移除HTML标签并截取前200个字符作为摘要
    const textContent = pressItem.content.replace(/<[^>]*>/g, '').trim();
    if (textContent.length > 200) {
      return textContent.substring(0, 200) + '...';
    }
    return textContent;
  }
  
  return '';
}

// 元数据定义
export const metadata = {
  title: "Press | Ambelie",
  description: "Stay updated with Ambelie's latest news, press releases, and media coverage featuring our brand and collections.",
};

export default async function PressPage() {
  const pressItems = await getPressItems();
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  return (
    <main>
      <ScrollAnimations />
      {/* Page Title */}
      <section className="page-header">
        <h1 className="page-title">PRESS</h1>
      </section>

      {/* Featured Press Section */}
      <section className="exhibitions-asymmetric store-locations">
        <div className="section-container">
          <h2 className="section-heading">LATEST NEWS</h2>
        </div>
        
        {pressItems.length > 0 ? (
          pressItems.map((pressItem, index) => (
            <div key={pressItem.id} className={`exhibitions-row ${index % 2 === 0 ? 'first-row' : 'second-row'}`}>
              <div className="exhibition-main-image animate-on-scroll">
                <div className="exhibition-image-container">
                  {pressItem.mainImage ? (
                    <Image 
                      src={`${API_URL}${pressItem.mainImage.url}`} 
                      alt={pressItem.mainImage.alternativeText || pressItem.name}
                      width={800} 
                      height={533} 
                      style={{objectFit: 'cover'}}
                      priority={index === 0}
                      unoptimized
                    />
                  ) : (
                    <div className="placeholder-image" style={{width: 800, height: 533, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <span>No Image</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="exhibition-content animate-on-scroll delay-200">
                <div className="exhibition-text">
                  <h2 className="exhibition-title animate-on-scroll delay-300">{pressItem.name}</h2>
                  <p className="store-address animate-on-scroll delay-400">{pressItem.projectType}</p>
                  <p className="exhibition-date animate-on-scroll delay-500">{formatDateLocationDisplay(pressItem)}</p>
                  {getIntroductionText(pressItem) && (
                    <p className="exhibition-description animate-on-scroll delay-600">{getIntroductionText(pressItem)}</p>
                  )}
                  <Link href={`/press/${pressItem.slug}`} className="view-more-link animate-on-scroll delay-700">
                    Read More
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-projects">
            <p>No press items available.</p>
          </div>
        )}
      </section>
    </main>
  );
}