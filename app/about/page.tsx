'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ScrollAnimations from '../../components/ScrollAnimations';

// Helper to build absolute media URLs from Strapi (same behavior as showroom pages)
function useApiUrl() {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  return API_URL;
}

function toMediaUrl(API_URL: string, media: any): string | null {
  if (!media) return null;
  const url = media?.url ?? media?.data?.attributes?.url ?? media?.attributes?.url ?? media;
  if (!url) return null;
  return /^(https?:)?\/\//i.test(url) ? url : `${API_URL}${url}`;
}

function extractMediaUrls(API_URL: string, mediaField: any): string[] {
  if (!mediaField) return [];
  if (Array.isArray(mediaField)) {
    return mediaField
      .map((m) => toMediaUrl(API_URL, m?.url ?? m?.attributes?.url ?? m))
      .filter(Boolean) as string[];
  }
  if (Array.isArray(mediaField?.data)) {
    return mediaField.data
      .map((m: any) => toMediaUrl(API_URL, m?.url ?? m?.attributes?.url ?? m))
      .filter(Boolean) as string[];
  }
  const single = toMediaUrl(API_URL, mediaField?.url ?? mediaField?.attributes?.url ?? mediaField);
  return single ? [single] : [];
}

function normalizeItem(item: any) {
  if (!item) return item;
  if (item.attributes) {
    return { id: item.id, ...item.attributes };
  }
  return item;
}

// Define a unified block type so both fallback and backend-mapped blocks share the same shape
interface AboutBlock {
  title: string;
  image: string;
  paragraphs?: string[];
  subtitle?: string;
  description?: string;
}

export default function AboutPage() {
  const API_URL = useApiUrl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showroom, setShowroom] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAboutShowroom() {
      try {
        const url = `${API_URL}/api/showrooms?filters[city][$eq]=About%20AMBELIE&populate[heroImage]=true&populate[spaces][populate][images]=true`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        const normalized = data.map(normalizeItem);
        if (!cancelled) setShowroom(normalized[0] || null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAboutShowroom();
    return () => {
      cancelled = true;
    };
  }, [API_URL]);

  // Fallback: preserve existing static content and images
  const fallbackSpaces = useMemo<AboutBlock[]>(
    () => [
      {
        title: 'Our Global Journey',
        paragraphs: [
          'AMBELIE is like a dreamscape that traverses time and space, crafting a fantastical world devoted to spatial aesthetics. We begin our journey in Asia, as pilgrims of art, traveling through the artistic sanctuaries of Europe and the cultural treasures of the Middle East. We gather timeless aesthetic treasures to weave an artistic, poetic space with historical resonance.',
          'These masterpieces, hailing from diverse cultural backgrounds yet unified by their classic and enduring nature, come together to form a living space with an inherent aesthetic harmony—these scattered pearls from various civilizations, crafted by different masters, blend seamlessly, creating a subtle resonance and connection, and together they tell a shared philosophy of life.',
        ],
        image: '/assets/about_images/about_images-1.jpg',
      },
      {
        title: 'Our Collection',
        paragraphs: [
          'Here, each embroidered screen is akin to an elegant poem, and every piece of embroidery resembles a canvas painted by time, imbued with the fluidity and charm of Asian craftsmanship, gently whispering tales of stories and legends.',
          "The deep elegance of Europe, the minimalist innovation of North America, and the enigmatic allure of the Middle East breathe a broader artistic vision into AMBELIE's space in Shanghai, where the subtle harmony and resonance between diverse cultures flow seamlessly. To look at a chair, a stone table, or any other object is to behold a sculpture, a chronicle, or a living plant.",
        ],
        image: '/assets/about_images/about_images-2.jpg',
      },
      {
        title: 'Our Mission',
        paragraphs: [
          "AMBELIE brings together artworks, furniture, fashion, and interior design. We hold the belief that the true value of art's beauty is best revealed through its use, and that beauty enriched with time becomes more enduring.",
          'Our mission is to bring these elements into the present, breathe new life into them, and shape our "self" within the material world we inhabit.',
        ],
        image: '/assets/about_images/about_images-3.jpg',
      },
    ],
    []
  );

  // Derive hero image
  const heroImageUrl = useMemo(() => {
    const url = toMediaUrl(API_URL, showroom?.heroImage);
    return url || '/assets/about_images/about_images-head.jpg';
  }, [API_URL, showroom]);

  // Derive 3 content blocks from backend, otherwise fallback to existing three
  const aboutBlocks = useMemo<AboutBlock[]>(() => {
    const defaults = fallbackSpaces;
    const spaces: any[] = Array.isArray(showroom?.spaces) ? showroom!.spaces : [];
    if (!spaces.length) return defaults;

    const mapped = spaces.map((raw, idx) => {
      const s = raw?.attributes ? { id: raw.id, ...raw.attributes } : raw;
      const title = s?.title || defaults[idx]?.title || '';
      const description = s?.description || '';
      const subtitle = s?.subtitle || '';
      const imgs = extractMediaUrls(API_URL, s?.images);
      const image = imgs[0] || defaults[idx]?.image;
      return { title, subtitle, description, image } as AboutBlock;
    });

    // Ensure exactly 3 blocks; fill with defaults if fewer; truncate if more
    const result = [0, 1, 2].map((i) => (mapped[i] || defaults[i])) as AboutBlock[];
    return result;
  }, [API_URL, showroom, fallbackSpaces]);

  return (
    <>
      <main className="about-page">
        <ScrollAnimations />
        {/* 首图区域（保持结构不变，仅图片可被后端覆盖） */}
        <section className="about-hero-section">
          <div className="about-hero-image">
            <Image
              src={heroImageUrl}
              alt="Ambelie About Hero"
              fill={true}
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              priority
              unoptimized={Boolean(showroom)}
            />
          </div>
          <div className="about-hero-overlay">
            <div className="about-hero-content">
              <h1 className="about-hero-title animate-on-scroll">About Ambelie</h1>
              <p className="about-hero-subtitle animate-on-scroll delay-200">Beauty is what remains after time has washed away.</p>
            </div>
          </div>
        </section>

        {/* 正文内容区域（三段图文，左右交错；有后端则用后端，无则保留静态） */}
        <section className="about-content-section">
          <div className="about-content-container">
            {aboutBlocks.map((block, index) => {
              const isRight = index % 2 === 1; // 右文左图
              const description: string = block?.description || '';
              const isHtml = /<\/?[a-z][\s\S]*>/i.test(description);

              return (
                <div key={index} className={`about-image-text-block ${isRight ? 'right-text' : 'left-text'}`}>
                  <div className={`about-text-content animate-on-scroll ${isRight ? 'slide-from-right' : 'slide-from-left'}`}>
                    <h2 className="about-section-title">{block.title}</h2>
                    {block.subtitle ? (
                      <p className="about-paragraph" style={{ fontStyle: 'italic', opacity: 0.95 }}>{block.subtitle}</p>
                    ) : null}

                    {isHtml ? (
                      <div className="about-paragraph" dangerouslySetInnerHTML={{ __html: description }} />
                    ) : (
                      (description ? description.split(/\n\s*\n/).map((p, i) => (
                        <p key={i} className="about-paragraph">{p}</p>
                      )) : block.paragraphs?.map((p: string, i: number) => (
                        <p key={i} className="about-paragraph">{p}</p>
                      )))
                    )}
                  </div>

                  <div className={`about-image-content animate-on-scroll ${isRight ? 'slide-from-left' : 'slide-from-right'} delay-200`}>
                    <Image
                      src={block.image}
                      alt={`${block.title}`}
                      width={500}
                      height={700}
                      style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                      unoptimized={Boolean(showroom)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

// 添加元数据 (Metadata API)
// Note: Client components cannot export metadata; moved/removed to avoid build error.
// export const metadata = {
//   title: 'About Ambelie | Our Story, Mission, and Collection',
//   description: "Learn about Ambelie's journey in curating timeless antique furniture, modern designs, and art. Discover our mission to blend beauty, culture, and lifestyle.",
// };