import React from 'react';
import styles from './PressDetail.module.css';

// --- TYPE DEFINITIONS ---
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

// --- DATA FETCHING ---
async function getPressItemBySlug(slug: string): Promise<PressItem | null> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  try {
    const res = await fetch(
      `${API_URL}/api/press-items?filters[slug][$eq]=${slug}&populate=*`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      throw new Error('Failed to fetch press item');
    }
    const json: StrapiResponse = await res.json();
    return json.data.length > 0 ? json.data[0] : null;
  } catch (error) {
    console.error('Error fetching press item by slug:', error);
    return null;
  }
}

// --- HELPER FUNCTIONS ---
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

function processTextWithLineBreaks(text: string): string {
  if (!text) return '';
  return `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />')}</p>`;
}

// --- PAGE COMPONENT ---
interface PressDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PressDetailPage({ params }: PressDetailPageProps) {
  const { slug } = await params;
  const pressItem = await getPressItemBySlug(slug);

  if (!pressItem) {
    return (
      <div className={styles.pressDetailContainer}>
        <div className="text-center py-20">
          <h1>Press item not found</h1>
          <p>The press item you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const dateDisplay = formatDateDisplay(pressItem);
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  return (
    <div className={styles.pressDetailContainer}>
      {/* Header Section */}
      <header className={styles.pressHeader}>
        <h1 className={styles.title}>{pressItem.name}</h1>
        <div className={styles.metaInfo}>
          <span className={styles.category}>{pressItem.projectType}</span>
          {dateDisplay && <span className={styles.date}>{dateDisplay}</span>}
          {pressItem.location && <span className={styles.source}>{pressItem.location}</span>}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
          <div className={styles.textColumn}>
            {/* Content */}
            {pressItem.content && (
              <div 
                className={styles.content}
                dangerouslySetInnerHTML={{ __html: processTextWithLineBreaks(pressItem.content) }}
              />
            )}
          </div>
        </main>
    </div>
  );
}