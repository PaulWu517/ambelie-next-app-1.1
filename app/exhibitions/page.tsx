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
  location?: string | null;
}

interface StrapiResponse {
  data: Exhibition[];
}

// Function to fetch exhibitions by status
async function getExhibitionsByStatus(status: 'current' | 'past'): Promise<Exhibition[]> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  try {
    const res = await fetch(
      `${API_URL}/api/exhibitions?filters[exhibitionStatus][$eq]=${status}&populate=*&sort=startDate:desc`, 
      {
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch ${status} exhibitions`);
    }
    const json: StrapiResponse = await res.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching ${status} exhibitions:`, error);
    return [];
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
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  const startFormatted = startDate.toLocaleDateString('en-US', formatOptions);
  const endFormatted = endDate.toLocaleDateString('en-US', formatOptions);
  
  return `${startFormatted} - ${endFormatted}`;
}

// 元数据定义
export const metadata = {
  title: "Exhibitions | Ambelie",
  description: "Explore current and past exhibitions at Ambelie. Discover unique collections of art, antiques, and design.",
};

export default async function ExhibitionsPage() {
  const currentExhibitions = await getExhibitionsByStatus('current');
  const pastExhibitions = await getExhibitionsByStatus('past');
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  return (
    <main>
      <ScrollAnimations />
      {/* Page Title */}
      <section className="page-header">
        <h1 className="page-title">EXHIBITIONS</h1>
      </section>

      {/* Current Section */}
      <section className="exhibitions-asymmetric store-locations">
        <div className="section-container">
          <h2 className="section-heading">CURRENT</h2>
        </div>
        
        {currentExhibitions.length > 0 ? (
          currentExhibitions.map((exhibition, index) => (
            <div key={exhibition.id} className={`exhibitions-row ${index % 2 === 0 ? 'first-row' : 'second-row'}`}>
          <div className="exhibition-main-image animate-on-scroll">
            <div className="exhibition-image-container">
                  {exhibition.mainImage ? (
                    <Image 
                      src={`${API_URL}${exhibition.mainImage.formats?.large?.url || exhibition.mainImage.url}`} 
                      alt={exhibition.mainImage.alternativeText || exhibition.name}
                      width={800} 
                      height={533} 
                      style={{objectFit: 'cover'}}
                      quality={75}
                      priority={index === 0}
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
                  <h2 className="exhibition-title animate-on-scroll delay-300">{exhibition.name}</h2>
                  <p className="store-address animate-on-scroll delay-400">{exhibition.exhibitionType}</p>
                  <p className="exhibition-date animate-on-scroll delay-500">{formatDateDisplay(exhibition)}</p>
                  {exhibition.introduction && (
                    <p className="exhibition-description animate-on-scroll delay-600">{exhibition.introduction}</p>
                  )}
                  <Link href={`/exhibitions/${exhibition.slug}`} className="view-more-link animate-on-scroll delay-700">
                    View Exhibition
                  </Link>
          </div>
        </div>
            </div>
          ))
        ) : (
          <div className="no-exhibitions">
            <p>No current exhibitions available.</p>
          </div>
        )}
      </section>

      {/* Past Exhibitions Section */}
      <section className="past-exhibitions-section">
        <div className="section-container">
          <h2 className="section-heading">PAST</h2>
          </div>
          
        {pastExhibitions.length > 0 ? (
          <div className="new-arrivals-grid">
            {pastExhibitions.map((exhibition, index) => (
              <div key={exhibition.id} className="product-item animate-on-scroll" style={{animationDelay: `${(index % 4) * 100 + 100}ms`}}>
                <Link href={`/exhibitions/${exhibition.slug}`} className="product-link">
              <div className="product-image">
                    {exhibition.mainImage ? (
                      <Image 
                        src={`${API_URL}${exhibition.mainImage.formats?.medium?.url || exhibition.mainImage.url}`} 
                        alt={exhibition.mainImage.alternativeText || exhibition.name}
                        width={400} 
                        height={400} 
                        style={{aspectRatio: '1/1', objectFit: 'cover'}}
                        quality={75}
                      />
                    ) : (
                      <div className="placeholder-image" style={{width: 400, height: 400, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <span>No Image</span>
              </div>
                    )}
              </div>
              <div className="product-info">
                    <h2 className="product-title animate-on-scroll">{exhibition.name}</h2>
                    <p className="product-period animate-on-scroll">{exhibition.exhibitionType}</p>
                    <p className="exhibition-date animate-on-scroll">{formatDateDisplay(exhibition)}</p>
              </div>
            </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-exhibitions">
            <p>No past exhibitions available.</p>
          </div>
        )}
      </section>
    </main>
  );
} 