import Image from "next/image";
import Link from 'next/link';
import ScrollAnimations from '../components/ScrollAnimations';

// 元数据定义
export const metadata = {
  title: "Ambelie | Fusion of Art, Design, and Timeless Antiques",
  description: "Discover Ambelie's unique collection of antique furniture, modern designs, and fashion, blending Eastern aesthetics with Western craftsmanship. Experience the art of living.",
};

export default function HomePage() {
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
            <h1 className="video-title">THE FUSION OF ART AND LIFE</h1>
            <p className="video-description">Discover the unique blend of art, culture, and timeless design.</p>
            <Link href="/exhibitions" className="video-button">Learn More</Link>
          </div>
        </div>
      </section>

      {/* New Arrivals Section - Asian Art */}
      <section className="new-arrivals-section">
        <div className="new-arrivals-header">
          <h2 className="section-heading">Asian Art</h2>
        </div>
        <Link href="/category/dividers" className="view-more-link see-more-link">See More</Link>
        <div className="new-arrivals-grid">
          <article className="product-item">
            <Link href="/product/divider-detail" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/1-1.jpg" alt="Chinese Antique Wooden Screen - Front View" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/1-2.jpg" alt="Chinese Antique Wooden Screen - Detail" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Chinese Antique Wooden Screen</h2>
                <p className="product-period">Qing Dynasty, Late 19th Century</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/product/divider-detail" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/2-1.jpg" alt="Carved Rosewood Room Divider - Front View" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/2-2.jpg" alt="Carved Rosewood Room Divider - Side View" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Carved Rosewood Room Divider</h2>
                <p className="product-period">Chinese, Early 20th Century</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/product/divider-detail" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/3-1.jpg" alt="Four-Panel Japanese Byobu Screen" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/3-2.jpg" alt="Four-Panel Japanese Byobu Screen - Unfolded" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Four-Panel Japanese Byobu Screen</h2>
                <p className="product-period">Meiji Period, 1880s</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/product/divider-detail" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/4-1.jpg" alt="Elm Wood Lattice Screen" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/4-2.jpg" alt="Elm Wood Lattice Screen - Detail" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Elm Wood Lattice Screen</h2>
                <p className="product-period">Chinese, Mid-20th Century</p>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Fullscreen Exhibition Section (CROSSING THE RIVER OF TIME) */}
      <section className="fullscreen-exhibition">
        <div className="exhibition-overlay">
          <h2 className="exhibition-slogan">CROSSING THE RIVER OF TIME</h2>
          <Link href="/events" className="exhibition-button">Explore More</Link>
        </div>
      </section>

      {/* Category Showcase Section (Featured Collections) */}
      <section className="category-showcase-section">
        <div className="section-header">
          <h2 className="section-heading">Featured Collections</h2>
        </div>
        <Link href="/category/all" className="view-more-link see-more-link">View All Categories</Link>
        <div className="category-showcase-grid">
          {/*竖版4张*/}
          <article className="product-item">
            <Link href="/category/cabinets" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Cabinets-1.jpg" alt="Antique and Modern Cabinets Collection" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/Cabinets-2.jpg" alt="Display of Cabinets" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Cabinets</h2>
                <p className="product-period">Antique & Modern</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/category/chairs" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Chairs-1.jpg" alt="Collection of Antique and Modern Chairs" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/Chairs-2.jpg" alt="Side view of Chair Collection" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Chairs</h2>
                <p className="product-period">Antique & Modern</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/category/sofas" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Sofa-1.jpg" alt="Various Styles of Sofas" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/Sofa-2.jpg" alt="Sofa Collection Display" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Sofas</h2>
                <p className="product-period">Various Styles</p>
              </div>
            </Link>
          </article>
          <article className="product-item">
            <Link href="/category/coffee-tables" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Coffee Tables-1.jpg" alt="Collection of Coffee Tables" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}} />
                <Image src="/assets/images/Coffee Tables-2.jpg" alt="Top view of Coffee Table Collection" className="hover-image" width={500} height={667} style={{aspectRatio: '3/4', objectFit: 'cover'}}/>
              </div>
              <div className="product-info">
                <h2 className="product-title">Coffee Tables</h2>
                <p className="product-period">Various Styles</p>
              </div>
            </Link>
          </article>
        </div>
        
        {/* 横版展示区域 */}
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
      </section>

      {/* Second Fullscreen Exhibition Section (THE FUSION OF ART AND LIFE - placeholder) */}
      <section className="fullscreen-exhibition" style={{backgroundImage: "url('/assets/images/placeholder-hero.jpg')", backgroundSize: 'cover', backgroundPosition: 'center'}}>
          <div className="exhibition-overlay">
              <h2 className="exhibition-slogan">THE FUSION OF ART AND LIFE</h2>
              <p className="video-description">From Europe to Asia, from classical to modern, AMBELIE is dedicated to bringing you an artistic space experience that integrates diverse cultures and aesthetics, making antique furniture an art piece in your life.</p>
              <Link href="/projects" className="exhibition-button">Learn More</Link>
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
                      <Link href="/reservation" className="view-more-link animate-on-scroll delay-700">Visit Store</Link>
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
                      <Link href="/reservation" className="view-more-link animate-on-scroll delay-700">Visit Store</Link>
                  </div>
              </div>
          </div>
      </section>

      {/* About Us Section */}
      <section className="about-us-section">
        <div className="about-us-inner">
          <h2 className="section-heading about-us-title animate-on-scroll delay-100">ABOUT US</h2>
          <div className="about-us-content">
            <p className="animate-on-scroll delay-200">Traveling through Europe, Asia, the Middle East, and North America, moving through more than 500 buying and antique stores, AMBELIE brings beauty across time, place, society, and lifestyle back to Shanghai & Hangzhou.</p>
            <p className="animate-on-scroll delay-300">Under the plain white dome supported by Collins columns, the same classic and timeless mid-century furniture from different cultures build a living place with an implicit aesthetic. Order - the relics of various civilizations, born from the works of other masters, are so harmonious and integrated into the same room, creating a hidden resonance and connection. </p>
            <div className="about-logo animate-on-scroll delay-400">
              <Image src="/assets/vi/Ambelie_about_Logos.png" alt="Ambelie Logo Detailed" width={260} height={75} style={{width: '260px', height: 'auto'}}/>
            </div>
          </div>
        </div>
      </section>
      </main>
  );
}
