import Image from 'next/image';
import Link from 'next/link';
import ScrollAnimations from '../../components/ScrollAnimations';

// 元数据定义
export const metadata = {
  title: "Exhibitions | Ambelie",
  description: "Explore current and past exhibitions at Ambelie. Discover unique collections of art, antiques, and design.",
};

export default function ExhibitionsPage() {
  return (
    <main>
      <ScrollAnimations />
      {/* Page Title */}
      <section className="page-header">
        <h1 className="page-title">EXHIBITIONS</h1>
      </section>

      {/* Current Section - Based on Store Showcase Module */}
      <section className="exhibitions-asymmetric store-locations">
        <div className="section-container">
          <h2 className="section-heading">CURRENT</h2>
        </div>
        
        {/* First Row: Left Image + Right Text - Current Exhibition */}
        <div className="exhibitions-row first-row">
          <div className="exhibition-main-image animate-on-scroll">
            <div className="exhibition-image-container">
              <Image src="/assets/images/current-1.jpg" alt="MODERN GLAMOUR: ART DECO FURNITURE & TIBETAN RUGS" width={800} height={533} style={{objectFit: 'cover'}} />
            </div>
          </div>
          <div className="exhibition-content animate-on-scroll delay-200">
            <div className="exhibition-text">
              <h2 className="exhibition-title animate-on-scroll delay-300">MODERN GLAMOUR</h2>
              <p className="store-address animate-on-scroll delay-400">JOINT EXHIBITION</p>
              <p className="exhibition-date animate-on-scroll delay-500">26 APRIL - 9 JUNE 2025</p>
              <p className="exhibition-description animate-on-scroll delay-600">Experience the captivating fusion of Art Deco aesthetics and Tibetan craftsmanship in this unique exhibition. Featuring exquisite furniture pieces and hand-woven Tibetan rugs, the exhibition explores the harmonious dialogue between modern design and traditional artistry.</p>
              <Link href="/exhibition-details" className="view-more-link animate-on-scroll delay-700">View Exhibition</Link> {/* Updated Link */}
            </div>
          </div>
        </div>
        
        {/* Second Row: Left Text + Right Image - New Exhibition */}
        <div className="exhibitions-row second-row">
          <div className="exhibition-main-image animate-on-scroll">
            <div className="exhibition-image-container">
              <Image src="/assets/images/current-2.jpg" alt="CLOUD BROCADE: NINE CHAPTERS" width={800} height={533} style={{objectFit: 'cover'}} />
            </div>
          </div>
          <div className="exhibition-content animate-on-scroll delay-200">
            <div className="exhibition-text">
              <h2 className="exhibition-title animate-on-scroll delay-300">CLOUD BROCADE</h2>
              <p className="store-address animate-on-scroll delay-400">SPECIAL EXHIBITION</p>
              <p className="exhibition-date animate-on-scroll delay-500">11 APRIL - 11 MAY 2025</p>
              <p className="exhibition-description animate-on-scroll delay-600">A significant retrospective featuring works from masters Zhang Ji Zhi, Liangkuan Xiuzong, and Inoue Yuichi. This exhibition showcases century-old brocade techniques, vibrant multi-colored compositions, and exceptional calligraphy, celebrating the rich heritage of East Asian artistic traditions.</p>
              <Link href="/exhibition-details-harmony" className="view-more-link animate-on-scroll delay-700">View Exhibition</Link> {/* Updated Link */}
            </div>
          </div>
        </div>
      </section>

      {/* Past Exhibitions Section - Based on Oriental Treasures Module */}
      <section className="past-exhibitions-section">
        <div className="section-container">
          <h2 className="section-heading">PAST</h2>
        </div>
        <div className="new-arrivals-grid"> {/* Assuming this class provides 4 columns */}
          {/* First Row: 4 Images */}
          <div className="product-item animate-on-scroll delay-100">
            <Link href="/exhibition-details-past" className="product-link"> {/* Updated Link */}
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-1.jpg" alt="MATERIAL WITNESS" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-200">MATERIAL WITNESS</h2>
                <p className="product-period animate-on-scroll delay-300">GROUP EXHIBITION</p>
                <p className="exhibition-date animate-on-scroll delay-400">15 JANUARY - 28 FEBRUARY 2025</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-200">
            <Link href="/exhibition-details-past" className="product-link"> {/* Updated Link */}
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-2.jpg" alt="RESONANCE IN FORM" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-300">RESONANCE IN FORM</h2>
                <p className="product-period animate-on-scroll delay-400">SOLO EXHIBITION</p>
                <p className="exhibition-date animate-on-scroll delay-500">10 DECEMBER - 5 JANUARY 2025</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-300">
            <Link href="/exhibition-details-past" className="product-link"> {/* Updated Link */}
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-3.jpg" alt="LIMINAL SPACES" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-400">LIMINAL SPACES</h2>
                <p className="product-period animate-on-scroll delay-500">CURATED BY LIU JIAN</p>
                <p className="exhibition-date animate-on-scroll delay-600">3 NOVEMBER - 2 DECEMBER 2024</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-400">
            <Link href="/exhibition-details-past" className="product-link"> {/* Updated Link */}
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-4.jpg" alt="ECHO OF SILENCE" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-500">ECHO OF SILENCE</h2>
                <p className="product-period animate-on-scroll delay-600">INTERNATIONAL ARTISTS</p>
                <p className="exhibition-date animate-on-scroll delay-700">15 SEPTEMBER - 25 OCTOBER 2024</p>
              </div>
            </Link>
          </div>
          
          {/* Second Row: Added from full HTML */}
          <div className="product-item animate-on-scroll delay-100">
            <Link href="/exhibition-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-5.jpg" alt="FRAGMENTS OF TIME" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-200">FRAGMENTS OF TIME</h2>
                <p className="product-period animate-on-scroll delay-300">RETROSPECTIVE</p>
                <p className="exhibition-date animate-on-scroll delay-400">20 JULY - 30 AUGUST 2024</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-200">
            <Link href="/exhibition-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-6.jpg" alt="BEYOND BORDERS" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-300">BEYOND BORDERS</h2>
                <p className="product-period animate-on-scroll delay-400">CULTURAL EXCHANGE</p>
                <p className="exhibition-date animate-on-scroll delay-500">5 JUNE - 10 JULY 2024</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-300">
            <Link href="/exhibition-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-7.jpg" alt="ESSENCE OF ELEGANCE" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-400">ESSENCE OF ELEGANCE</h2>
                <p className="product-period animate-on-scroll delay-500">DESIGN SPOTLIGHT</p>
                <p className="exhibition-date animate-on-scroll delay-600">10 APRIL - 25 MAY 2024</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-400">
            <Link href="/exhibition-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-8.jpg" alt="HERITAGE REDEFINED" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-500">HERITAGE REDEFINED</h2>
                <p className="product-period animate-on-scroll delay-600">CONTEMPORARY CLASSICS</p>
                <p className="exhibition-date animate-on-scroll delay-700">15 FEBRUARY - 30 MARCH 2024</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
} 