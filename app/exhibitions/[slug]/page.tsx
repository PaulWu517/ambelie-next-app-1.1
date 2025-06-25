import React from 'react';
import Image from 'next/image';
import styles from './ExhibitionDetail.module.css';

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

interface Exhibition {
  id: number;
  name: string;
  slug: string;
  exhibitionType: string;
  exhibitionStatus: 'current' | 'past';
  startDate: string;
  endDate: string;
  displayDate?: string | null;
  mainImage?: ImageItem | null;
  introduction?: string | null;
  description?: string | null;
  images?: ImageItem[] | null;
  location?: string | null;
}

interface StrapiResponse {
  data: Exhibition[];
}

// Function to fetch a single exhibition by its slug
async function getExhibitionBySlug(slug: string): Promise<Exhibition | null> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  try {
    const res = await fetch(
      `${API_URL}/api/exhibitions?filters[slug][$eq]=${slug}&populate=*`, 
      {
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      throw new Error('Failed to fetch exhibition');
    }
    const json: StrapiResponse = await res.json();
    if (json.data.length === 0) {
      return null;
    }
    return json.data[0];
  } catch (error) {
    console.error('Error fetching exhibition by slug:', error);
    return null;
  }
}

// Helper function to format date display
function formatDateDisplay(exhibition: Exhibition): string {
  if (exhibition.displayDate) {
    return exhibition.displayDate;
  }
  
  const startDate = new Date(exhibition.startDate);
  const endDate = new Date(exhibition.endDate);
  
  const formatOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long' 
  };
  
  const startFormatted = startDate.toLocaleDateString('en-US', formatOptions);
  const endFormatted = endDate.toLocaleDateString('en-US', formatOptions);
  
  return `${startFormatted} - ${endFormatted}`;
}

// Helper function to process text with line breaks
function processTextWithLineBreaks(text: string): string {
  if (!text) return '';
  
  // Replace line breaks with HTML <br> tags
  return text
    .replace(/\n\n/g, '</p><p>')  // Double line breaks become paragraph breaks
    .replace(/\n/g, '<br />')     // Single line breaks become <br> tags
    .replace(/^/, '<p>')          // Add opening paragraph tag
    .replace(/$/, '</p>');        // Add closing paragraph tag
}

export default async function ExhibitionDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params; // 等待 params
  const exhibition = await getExhibitionBySlug(slug);
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  if (!exhibition) {
    return (
      <div className={styles.exhibitionDetailContainer}>
        <div className="text-center py-20">
          <h1>Exhibition not found</h1>
          <p>The exhibition you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const dateDisplay = formatDateDisplay(exhibition);

  return (
    <div className={styles.exhibitionDetailContainer}>
      <header className={styles.exhibitionHeader}>
        <h1 className={styles.title}>{exhibition.name}</h1>
        <div className={styles.metaInfo}>
          <span className={styles.type}>{exhibition.exhibitionType}</span>
          <span className={styles.date}>{dateDisplay}</span>
          {exhibition.location && (
            <span className={styles.location}>{exhibition.location}</span>
          )}
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.textColumn}>
          {exhibition.introduction && (
            <div 
              className={styles.introduction}
              dangerouslySetInnerHTML={{ __html: processTextWithLineBreaks(exhibition.introduction) }}
            />
          )}
          {exhibition.description && (
            <div 
              className={styles.description}
              dangerouslySetInnerHTML={{ __html: processTextWithLineBreaks(exhibition.description) }}
            />
          )}
        </div>
        
        <div className={styles.imageColumn}>
          {exhibition.images && exhibition.images.length > 0 ? (
            exhibition.images.map((image, index) => {
              // 优先使用smaller format以避免超时，如果不存在则fallback到原图
              const imageUrl = image.formats?.large?.url || image.formats?.medium?.url || image.url;
              const imageWidth = image.formats?.large?.width || image.formats?.medium?.width || 800;
              const imageHeight = image.formats?.large?.height || image.formats?.medium?.height || 1200;
              
              return (
                <div key={index} className={styles.imageWrapper}>
                  <Image
                    src={`${API_URL}${imageUrl}`}
                    alt={image.alternativeText || `Exhibition image ${index + 1}`}
                    width={imageWidth}
                    height={imageHeight}
                    className={styles.image}
                    quality={75}
                    priority={index === 0}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
              );
            })
          ) : (
            <div className={styles.noImages}>
              <p>No images available for this exhibition.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 