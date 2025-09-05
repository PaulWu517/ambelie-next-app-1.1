'use client';

import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import Image from 'next/image';
import styles from './HangzhouShowroom.module.css';
import { useSearchParams } from 'next/navigation';

// Helper to build absolute media URLs from Strapi
function useApiUrl() {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  return API_URL;
}

function toMediaUrl(API_URL: string, media: any): string | null {
  if (!media) return null;
  // Support shapes: string | {url} | {data:{attributes:{url}}}
  const url = media?.url ?? media?.data?.attributes?.url ?? media;
  if (!url) return null;
  return /^(https?:)?\/\//i.test(url) ? url : `${API_URL}${url}`;
}

// Extract multiple media urls from various shapes (array, {data:[]}, etc.)
function extractMediaUrls(API_URL: string, mediaField: any): string[] {
  if (!mediaField) return [];
  // Case 1: Already an array of media objects/urls
  if (Array.isArray(mediaField)) {
    return mediaField
      .map((m) => toMediaUrl(API_URL, (m as any)?.url ?? (m as any)?.attributes?.url ?? m))
      .filter(Boolean) as string[];
  }
  // Case 2: Strapi v4 relation/media shape { data: [...] }
  if (Array.isArray((mediaField as any)?.data)) {
    return (mediaField as any).data
      .map((m: any) => toMediaUrl(API_URL, m?.url ?? m?.attributes?.url))
      .filter(Boolean) as string[];
  }
  // Case 3: Single media object
  const single = toMediaUrl(API_URL, (mediaField as any)?.url ?? (mediaField as any)?.attributes?.url ?? mediaField);
  return single ? [single] : [];
}

// Normalize Strapi v4 response (with attributes) into flat object
function normalizeItem(item: any) {
  if (!item) return item;
  if (item.attributes) {
    return { id: item.id, ...item.attributes };
  }
  return item;
}

// 元数据定义
// export const metadata = {
//   title: "Ambelie Hangzhou | Showroom",
//   description: "Discover AMBELIE Hangzhou showroom at Hongning Road, where French elegance meets Chinoiserie style in our thoughtfully designed spaces.",
// };

// Component that uses useSearchParams
function HangzhouShowroomContent() {
  const API_URL = useApiUrl();
  const searchParams = useSearchParams();
  const debug = searchParams?.get('debug') === '1' || false;

  // ------------------ State for backend data ------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [requestUrl, setRequestUrl] = useState<string>('');
  const [showroom, setShowroom] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchShowroom() {
      // Deep-populate spaces.images to ensure media are included
      const url = `${API_URL}/api/showrooms?filters[city][$eq]=Hangzhou&populate[heroImage]=true&populate[spaces][populate][images]=true`;
      setRequestUrl(url);
      console.time('[Hangzhou] fetch showroom');
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          const msg = `HTTP ${res.status} ${res.statusText}`;
          if (debug) console.error('[Hangzhou] fetch showroom failed:', msg);
          throw new Error(msg);
        }
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        const normalized = data.map(normalizeItem);
        const first = normalized[0] || null;
        if (!cancelled) {
          setShowroom(first);
          setError(null);
        }
        if (debug) {
          console.log('[Hangzhou] showroom raw json:', json);
          console.log('[Hangzhou] showroom normalized:', first);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
        console.timeEnd('[Hangzhou] fetch showroom');
      }
    }
    fetchShowroom();
    return () => {
      cancelled = true;
    };
  }, [API_URL, debug]);

  // ------------------ Fallback static content ------------------
  const fallbackSpaces = [
    {
      id: 'living-room',
      title: 'LIVING ROOM',
      subtitle: 'French Elegance',
      description: 'The main living space showcases our finest collection where French sophistication meets Oriental charm. High ceilings and carefully curated pieces create an atmosphere of refined luxury.',
      images: [
        '/assets/hangzhou/living-room-1.jpg',
        '/assets/hangzhou/living-room-2.jpg'
      ]
    },
    {
      id: 'vip-room',
      title: 'VIP ROOM',
      subtitle: 'Private Sanctuary',
      description: 'An intimate space designed for exclusive consultations and private viewings. The VIP room offers a serene environment where clients can experience our pieces in peaceful solitude.',
      images: [
        '/assets/hangzhou/vip-room-1.jpg',
        '/assets/hangzhou/vip-room-2.jpg'
      ]
    },
    {
      id: 'corridor',
      title: 'CORRIDOR',
      subtitle: 'Transitional Grace',
      description: 'The connecting corridor serves as a gallery space, featuring carefully selected pieces that guide visitors through different aesthetic experiences within our showroom.',
      images: [
        '/assets/hangzhou/corridor-1.jpg',
        '/assets/hangzhou/corridor-2.jpg'
      ]
    },
    {
      id: 'side-hall',
      title: 'SIDE HALL',
      subtitle: 'Intimate Corner',
      description: 'A cozy alcove perfect for discovering smaller treasures and accessories. This space embodies the intimate scale of French salon culture with Oriental accents.',
      images: [
        '/assets/hangzhou/side-hall-1.jpg',
        '/assets/hangzhou/side-hall-2.jpg'
      ]
    }
  ];

  // Derive UI data from backend (if available), otherwise fallback
  const heroImageUrl = useMemo(() => {
    const url = toMediaUrl(API_URL, showroom?.heroImage);
    return url || '/assets/hangzhou/hero-image.jpg';
  }, [API_URL, showroom]);

  const heroAddress = showroom?.address || 'No. 1788 Hongning Road, Xiaoshan District';
  const heroHours = showroom?.hours || 'Opening Hours: 10:00-20:00';

  const heroDescriptionHtml: string | null = showroom?.heroDescription || null;

  const spaces = useMemo(() => {
    if (showroom?.spaces?.length) {
      const mapped = showroom.spaces.map((s: any, idx: number) => {
        const imgs = extractMediaUrls(API_URL, s?.images);
        return {
          id: `${s?.title || 'space'}-${idx}`,
          title: s?.title || '',
          subtitle: s?.subtitle || '',
          description: s?.description || '',
          images: imgs,
        };
      });
      return mapped;
    }
    return fallbackSpaces;
  }, [API_URL, showroom, fallbackSpaces]);

  const contactInfoHtml: string | null = showroom?.contactInfo || null;

  // ------------------ Animation: IntersectionObserver ------------------
  const animatedElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create observer once
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.animated);
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe any elements already collected (e.g., from initial render)
    animatedElementsRef.current.forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const addToRefs = (el: HTMLDivElement | null) => {
    if (el && !animatedElementsRef.current.includes(el)) {
      animatedElementsRef.current.push(el);
      // If observer is ready, observe newly mounted elements immediately
      observerRef.current?.observe(el);
    }
  };

  return (
    <main className={styles.container}>
      {/* Debug Panel */}
      {debug && (
        <div style={{position: 'fixed', right: 10, bottom: 10, zIndex: 9999, background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '10px 12px', borderRadius: 6, maxWidth: 420, fontSize: 12, lineHeight: 1.4}}>
          <div style={{fontWeight: 600, marginBottom: 6}}>Hangzhou Page Debug</div>
          <div>API_URL: {API_URL}</div>
          <div>Request: {requestUrl || '(pending...)'}</div>
          <div>Status: {loading ? 'loading' : error ? `error: ${error}` : 'ok'}</div>
          {showroom && (
            <div style={{marginTop: 6}}>
              <div>ID: {showroom.id} | City: {showroom.city} | Slug: {showroom.slug}</div>
              <div>Spaces: {Array.isArray(showroom.spaces) ? showroom.spaces.length : 0}</div>
              <div>Hero image: {toMediaUrl(API_URL, showroom.heroImage) || 'N/A'}</div>
            </div>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroImageContainer}>
          <Image
            src={heroImageUrl}
            alt="AMBELIE Hangzhou Showroom"
            width={1200}
            height={800}
            style={{ objectFit: 'cover' }}
            priority
            unoptimized={Boolean(showroom)}
          />
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>AMBELIE HANGZHOU</h1>
              <div className={styles.heroInfo}>
                <p className={styles.address}>{heroAddress}</p>
                <p className={styles.hours}>{heroHours}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div 
          className={styles.heroDescription}
          ref={addToRefs}
        >
          {heroDescriptionHtml ? (
            <div className={styles.descriptionContent} dangerouslySetInnerHTML={{ __html: heroDescriptionHtml }} />
          ) : (
            <div className={styles.descriptionContent}>
              <p>
                Unlike the standalone three-story old villas on Shanghai's Kangping Road, which are imbued with a strong Haipai (Shanghai-style) charm, AMBELIE Hangzhou showroom was co-designed by its founder, allowing for the realization of more creative inspirations.
              </p>
              <p>
                The plaster ceiling, molded and carved from an artist's drawing, the hybrid Roman columns, and the Turkish white sand fireplace are all enveloped in a pure misty white. This represents both an attempt to embrace a purer French style and a journey of "dream-weaving."
              </p>
              <p>
                In the higher-ceilinged space, the inherent presence of the screen finds room to unfold, also harking back to the original intent behind the space's creation—a fondness for the "Chinoiserie" style.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Spaces Sections */}
      {spaces.map((space: any, index: number) => (
        <section key={space.id} className={`${styles.spaceSection} ${index % 2 === 1 ? styles.reversed : ''}`}>
          <div 
            className={styles.spaceImages}
            ref={addToRefs}
          >
            <div className={styles.imageGrid}>
              {space.images.map((imageSrc: string, imgIndex: number) => (
                <div key={imgIndex} className={styles.imageContainer}>
                  <Image
                    src={imageSrc}
                    alt={`${space.title} ${imgIndex + 1}`}
                    width={450}
                    height={600}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div 
            className={styles.spaceContent}
            ref={addToRefs}
          >
            <div className={styles.spaceText}>
              <h2 className={styles.spaceTitle}>{space.title}</h2>
              <h3 className={styles.spaceSubtitle}>{space.subtitle}</h3>
              <p className={styles.spaceDescription}>{space.description}</p>
            </div>
          </div>
        </section>
      ))}

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div 
          className={styles.contactContent}
          ref={addToRefs}
        >
          <h2 className={styles.contactTitle}>VISIT THE GALLERY</h2>
          {contactInfoHtml ? (
            <div className={styles.contactDescription} dangerouslySetInnerHTML={{ __html: contactInfoHtml }} />
          ) : (
            <>
              <p className={styles.contactDescription}>
                Experience our curated collection in person. Private appointments are available for personalized consultations.
              </p>
              <div className={styles.contactInfo}>
                <p><strong>Address:</strong> No. 1788 Hongning Road, Xiaoshan District, Hangzhou</p>
                <p><strong>Hours:</strong> 10:00-20:00, Daily</p>
                <p><strong>Contact:</strong> For appointments and inquiries</p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

// Main component with Suspense wrapper
export default function HangzhouShowroomPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HangzhouShowroomContent />
    </Suspense>
  );
}