import Image from "next/image";
import Link from 'next/link';
import ScrollAnimations from '../components/ScrollAnimations';

// 定义首页展览的类型（与exhibitions页面保持一致）
interface ImageItem {
  url: string;
  alternativeText?: string | null;
  formats?: {
    large?: { url: string; width: number; height: number; size: number; };
    medium?: { url: string; width: number; height: number; size: number; };
    small?: { url: string; width: number; height: number; size: number; };
    xlarge?: { url: string; width: number; height: number; size: number; };
  };
}

interface HomepageExhibition {
  id: number;
  name: string;
  slug: string;
  exhibitionType: string;
  exhibitionStatus: 'current' | 'past';
  startDate: string;
  endDate: string;
  mainImage?: ImageItem | null;
  introduction?: string | null;
  description?: string | null;
  location?: string | null;
  showOnHomepage: boolean;
}

interface HomepageProject {
  id: number;
  name: string;
  slug: string;
  projectType?: string;
  date?: string;
  location?: string;
  mainImage?: ImageItem | null;
  introduction?: string | null;
  content?: string | null;
  showOnHomepage: boolean;
}

interface StrapiResponse<T> {
  data: T[];
}

// 获取首页展览数据的函数
async function getHomepageExhibition(): Promise<HomepageExhibition | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
    const response = await fetch(
      `${API_URL}/api/exhibitions?filters[showOnHomepage][$eq]=true&populate=*&sort=startDate:desc`,
      {
        next: { revalidate: 60 }, // 缓存60秒
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch exhibition data');
      return null;
    }
    
    const json: StrapiResponse<HomepageExhibition> = await response.json();
    
    // 返回第一个符合条件的展览
    if (json.data && json.data.length > 0) {
      return json.data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching exhibition data:', error);
    return null;
  }
}

// 获取首页项目数据的函数
async function getHomepageProject(): Promise<HomepageProject | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
    const response = await fetch(
      `${API_URL}/api/projects?filters[showOnHomepage][$eq]=true&populate=*&sort=date:desc`,
      {
        next: { revalidate: 60 }, // 缓存60秒
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch project data');
      return null;
    }
    
    const json: StrapiResponse<HomepageProject> = await response.json();
    
    // 返回第一个符合条件的项目
    if (json.data && json.data.length > 0) {
      return json.data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching project data:', error);
    return null;
  }
}

// 元数据定义
export const metadata = {
  title: "Ambelie | Fusion of Art, Design, and Timeless Antiques",
  description: "Discover Ambelie's unique collection of antique furniture, modern designs, and fashion, blending Eastern aesthetics with Western craftsmanship. Experience the art of living.",
};

export default async function HomePage() {
  // 获取首页展览数据和项目数据
  const homepageExhibition = await getHomepageExhibition();
  const homepageProject = await getHomepageProject();

  return (
    <main>
      <ScrollAnimations />
      {/* Video Background Section */}
      <section className="video-background-section">
        <video className="video-background" autoPlay loop muted playsInline>
          <source src="/assets/video/WeChat_20250519180532.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="video-overlay">
          <div className="video-content">
            <div className="seal-logo">
              <Image src="/assets/images/seal_logo.png" alt="Ambelie Seal Logo" width={120} height={120} style={{opacity: 0.8, height: 'auto'}} />
            </div>
            <p className="video-description">Beauty is what remains after time has washed<br/>everything else away.</p>
            {/* <Link href="/exhibitions" className="video-button">Learn More</Link> */}
          </div>
        </div>
      </section>

      {/* New Arrivals Section - Products */}
      <section className="new-arrivals-section">
        <div className="new-arrivals-header">
          <div className="new-arrivals-left">
            <h2 className="section-heading">Featured Collections</h2>
            <p className="section-subtitle">Curated Excellence</p>
          </div>
        </div>
        <div className="new-arrivals-grid">
          <article className="product-item">
            <Link href="/oriental-furniture" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_collection/ORIENTAL FURNITURE_1.jpg" alt="Oriental Furniture Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_collection/ORIENTAL FURNITURE_2.jpg" alt="Oriental Furniture Collection - Detail" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">ORIENTAL FURNITURE</h2>
                <p className="product-period">Traditional & Contemporary</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/category/antique-furniture" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_collection/ANTIQUE FURNITURE_1.jpg" alt="Antique Furniture Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_collection/ANTIQUE FURNITURE_2.jpg" alt="Antique Furniture Collection - Detail" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">ANTIQUE FURNITURE</h2>
                <p className="product-period">Historic & Vintage</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/category/lighting" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_collection/LIGHTING_1.jpg" alt="Lighting Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_collection/LIGHTING_2.jpg" alt="Lighting Collection - Detail" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">LIGHTING</h2>
                <p className="product-period">Design & Vintage</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/category/art" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_collection/ART_1.jpg" alt="Art Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_collection/ART_2.jpg" alt="Art Collection - Detail" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">ART</h2>
                <p className="product-period">Contemporary & Classic</p>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Fullscreen Exhibition Section (Dynamic Exhibition) */}
      <section 
        className="fullscreen-exhibition"
        style={{
          backgroundImage: homepageExhibition && homepageExhibition.mainImage
            ? `url(${ (homepageExhibition.mainImage.url?.startsWith('http') ? homepageExhibition.mainImage.url : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app'}${homepageExhibition.mainImage.url}`) })`
            : "url('/assets/images/placeholder-hero.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="exhibition-overlay">
          <h2 className="exhibition-slogan">
            {homepageExhibition?.name?.toUpperCase() || 'CROSSING THE RIVER OF TIME'}
          </h2>
          <Link 
            href="/exhibitions" 
            className="exhibition-button"
          >
            Explore More
          </Link>
        </div>
      </section>

      {/* Category Showcase Section (Featured Fashion) */}
      <section className="category-showcase-section">
        <div className="section-header">
          <h2 className="section-heading">Featured Fashion</h2>
        </div>
        <Link href="/fashion" className="view-more-link see-more-link">View All Categories</Link>
        <div className="category-showcase-grid">
          {/*竖版4张*/}
          <article className="product-item">
            <Link href="/fashion?category=category" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_fashion/SHOP BY CATEGORY-1.JPG" alt="Shop by Category Fashion Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_fashion/SHOP BY CATEGORY-2.JPG" alt="Shop by Category Fashion Display" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">SHOP BY CATEGORY</h2>
                <p className="product-period">Fashion Collections</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/fashion?category=runway-archive" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_fashion/RUNWAY ARCHIVE-1.jpg" alt="Runway Archive Fashion Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_fashion/RUNWAY ARCHIVE-2.jpg" alt="Runway Archive Fashion Display" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">RUNWAY ARCHIVE</h2>
                <p className="product-period">Designer Collections</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/fashion?category=curated-collection" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_fashion/CURATED COLLECTION-1.JPG" alt="Curated Fashion Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_fashion/CURATED COLLECTION-2.JPG" alt="Curated Fashion Display" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">CURATED COLLECTION</h2>
                <p className="product-period">Exclusive Pieces</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/fashion?category=brand-partners" className="product-link">
              <div className="product-image">
                <Image src="/assets/feature_fashion/BRAND PARTNERS-1.JPG" alt="Brand Partners Fashion Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/feature_fashion/BRAND PARTNERS-2.JPG" alt="Brand Partners Fashion Display" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">BRAND PARTNERS</h2>
                <p className="product-period">Collaborative Works</p>
              </div>
            </Link>
          </article>
        </div>
        
        {/* 横版展示区域 - 已注释 */}
        {/*
        <div className="featured-categories">
          <article className="product-item featured-item">
              <Link href="/category/dividers" className="product-link">
                  <div className="product-image wide-image">
                      <div className="horizontal-image-wrapper">
                          <Image src="/assets/images/Dividers-1.jpg" alt="Classic Oriental Screen Dividers" width={800} height={450} style={{objectFit: 'cover'}}/>
                          <Image src="/assets/images/Dividers-2.jpg" alt="Collection of Screen Dividers" className="hover-image" width={800} height={450} style={{objectFit: 'cover'}}/>
                      </div>
                  </div>
                  <div className="product-info">
                      <h2 className="product-title">Dividers</h2>
                      <p className="product-period">Classic Oriental Screens</p>
                  </div>
              </Link>
          </article>
          <article className="product-item featured-item">
              <Link href="/category/lighting" className="product-link">
                  <div className="product-image wide-image">
                      <div className="horizontal-image-wrapper">
                          <Image src="/assets/images/Lighting-1.jpg" alt="Vintage and Modern Design Lighting Fixtures" width={800} height={450} style={{objectFit: 'cover'}}/>
                          <Image src="/assets/images/Lighting-2.jpg" alt="Display of Lighting Collection" className="hover-image" width={800} height={450} style={{objectFit: 'cover'}}/>
                      </div>
                  </div>
                  <div className="product-info">
                      <h2 className="product-title">Lighting</h2>
                      <p className="product-period">Vintage & Modern Design</p>
                  </div>
              </Link>
          </article>
        </div>
        */}
      </section>

      {/* Second Fullscreen Exhibition Section (Dynamic Project) */}
      <section 
        className="fullscreen-exhibition" 
        style={{
          backgroundImage: homepageProject && homepageProject.mainImage
            ? `url(${ (homepageProject.mainImage.url?.startsWith('http') ? homepageProject.mainImage.url : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app'}${homepageProject.mainImage.url}`) })`
            : "url('/assets/images/placeholder-hero.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
          <div className="exhibition-overlay">
              <h2 className="exhibition-slogan">
                {homepageProject?.name?.toUpperCase() || 'THE FUSION OF ART AND LIFE'}
              </h2>
              <Link 
                href="/projects" 
                className="exhibition-button"
              >
                Learn More
              </Link>
          </div>
      </section>

      {/* Store Locations / Current Exhibitions Section */}
      <section className="exhibitions-asymmetric store-locations">
          {/* Shanghai Store */}
          <div className="exhibitions-row first-row">
              <div className="exhibition-main-image animate-on-scroll">
                  <div className="exhibition-image-container">
                      <Image src="/assets/images/Shanghai-Store.jpg" alt="AMBELIE Gallery Shanghai Store Front" width={800} height={533} style={{objectFit: 'cover'}}/>
                  </div>
              </div>
              <div className="exhibition-content animate-on-scroll delay-200">
                  <div className="exhibition-text">
                      <h2 className="exhibition-title animate-on-scroll delay-300">AMBELIE SHANGHAI</h2>
                      <p className="store-address animate-on-scroll delay-400">No. 21 Kangping Road, Xuhui District, Shanghai</p>
                      <p className="exhibition-date animate-on-scroll delay-500">Opening Hours: 10:00 - 20:00</p>
                      <p className="exhibition-description animate-on-scroll delay-600">AMBELIE has returned to Shanghai, nestled in a serene garden villa at Kangping Road. Our treasured collection has found its roots in this three-story garden house built in 1945, surrounded by swaying shadows and lush greenery.</p>
                      <Link href="/about/shanghai" className="view-more-link animate-on-scroll delay-700">View More</Link>
                  </div>
              </div>
          </div>
          
          {/* Hangzhou Store */}
          <div className="exhibitions-row second-row">
              <div className="exhibition-main-image animate-on-scroll">
                  <div className="exhibition-image-container">
                      <Image src="/assets/images/Hangzhou-Store.jpg" alt="AMBELIE Gallery Hangzhou Store Interior" width={800} height={533} style={{objectFit: 'cover'}}/>
                  </div>
              </div>
              <div className="exhibition-content animate-on-scroll delay-200">
                  <div className="exhibition-text">
                      <h2 className="exhibition-title animate-on-scroll delay-300">AMBELIE HANGZHOU</h2>
                      <p className="store-address animate-on-scroll delay-400">By Appointment</p>
                      <p className="exhibition-date animate-on-scroll delay-500">Opening Hours: 10:00 - 20:00</p>
                      <p className="exhibition-description animate-on-scroll delay-600">We've brought treasures from around the world to our Hangzhou space. This street once sheltered the renowned artist Mei Lanfang and was home to "Huang Garden." The refined aesthetic exists quietly here, immersed in a sense of history and culture.</p>
                      <Link href="/about/hangzhou" className="view-more-link animate-on-scroll delay-700">View More</Link>
                  </div>
              </div>
          </div>
      </section>

      {/* About Us Section */}
      <section className="about-us-section">
        <div className="about-us-inner">
          <h2 className="section-heading about-us-title animate-on-scroll delay-100">ABOUT US</h2>
          <div className="about-us-content">
            <p className="animate-on-scroll delay-200">AMBELIE brings beauty across time, place, culture, and lifestyle. Timeless mid-century pieces from different cultures come together to form a living space defined by understated elegance.</p>
            <p className="animate-on-scroll delay-300">Artifacts from diverse civilizations, creations of great masters, harmoniously coexist within the same room, evoking a subtle sense of resonance and connection across eras.</p>
            <div className="about-logo animate-on-scroll delay-400">
              <Image src="/assets/vi/Ambelie_about_Logos.png" alt="Ambelie Logo Detailed" width={260} height={75} style={{width: '260px', height: 'auto'}}/>
            </div>
          </div>
        </div>
      </section>
      </main>
  );
}
