import Image from 'next/image';
import Link from 'next/link';
import ScrollAnimations from '../../components/ScrollAnimations';

// 元数据定义
export const metadata = {
  title: "Events | Ambelie",
  description: "Stay updated on upcoming and past events at Ambelie, including design salons, craftsman series, and exclusive showcases.",
};

export default function EventsPage() {
  return (
    <main>
      <ScrollAnimations />
      {/* Page Title */}
      <section className="page-header">
        <h1 className="page-title">EVENTS</h1>
      </section>

      {/* Upcoming Section - Based on Store Showcase Module */}
      <section className="exhibitions-asymmetric store-locations"> {/* Using similar classes as exhibitions for styling consistency */}
        <div className="section-container">
          <h2 className="section-heading">UPCOMING</h2>
        </div>
        
        {/* First Row: Left Image + Right Text - Current Event */}
        <div className="exhibitions-row first-row">
          <div className="exhibition-main-image animate-on-scroll">
            <div className="exhibition-image-container">
              {/* Note: Using current-2.jpg as per event.html, alt text updated */}
              <Image src="/assets/images/current-2.jpg" alt="DESIGN SALON: ARCHITECTURAL FURNITURE SYMPOSIUM" width={800} height={533} style={{objectFit: 'cover'}} />
            </div>
          </div>
          <div className="exhibition-content animate-on-scroll delay-200">
            <div className="exhibition-text">
              <h2 className="exhibition-title animate-on-scroll delay-300">DESIGN SALON</h2>
              <p className="store-address animate-on-scroll delay-400">ARCHITECTURAL SYMPOSIUM</p>
              <p className="exhibition-date animate-on-scroll delay-500">15 MAY - 18 MAY 2025</p>
              <p className="exhibition-description animate-on-scroll delay-600">Join us for an inspiring three-day symposium featuring renowned international architects and furniture designers. Experience hands-on workshops, panel discussions, and live demonstrations exploring the intersection of architecture and furniture design in contemporary spaces.</p>
              <Link href="/event-details" className="view-more-link animate-on-scroll delay-700">View Event</Link>
            </div>
          </div>
        </div>
        
        {/* Second Row: Left Text + Right Image - New Event */}
        <div className="exhibitions-row second-row">
          <div className="exhibition-main-image animate-on-scroll">
            <div className="exhibition-image-container">
              {/* Note: Using current-1.jpg as per event.html, alt text updated */}
              <Image src="/assets/images/current-1.jpg" alt="MASTER CRAFTSMAN SERIES" width={800} height={533} style={{objectFit: 'cover'}} />
            </div>
          </div>
          <div className="exhibition-content animate-on-scroll delay-200">
            <div className="exhibition-text">
              <h2 className="exhibition-title animate-on-scroll delay-300">CRAFTSMAN SERIES</h2>
              <p className="store-address animate-on-scroll delay-400">LIVE DEMONSTRATIONS</p>
              <p className="exhibition-date animate-on-scroll delay-500">22 MAY - 25 MAY 2025</p>
              <p className="exhibition-description animate-on-scroll delay-600">Witness master artisans from Japan, China, and Europe demonstrate traditional techniques in furniture making, textile weaving, and decorative arts. This exclusive event offers rare insights into centuries-old craftsmanship methods and their modern applications.</p>
              <Link href="/event-details-craftsman" className="view-more-link animate-on-scroll delay-700">View Event</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Past Events Section - Based on Oriental Treasures Module */}
      <section className="past-exhibitions-section"> {/* Using similar class for styling */}
        <div className="section-container">
          <h2 className="section-heading">PAST</h2>
        </div>
        <div className="new-arrivals-grid"> {/* Assuming this class provides 4 columns */}
          {/* First Row: 4 Images */}
          <div className="product-item animate-on-scroll delay-100">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-1.jpg" alt="COLLECTOR'S CIRCLE" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-200">COLLECTOR&#39;S CIRCLE</h2>
                <p className="product-period animate-on-scroll delay-300">PRIVATE AUCTION</p>
                <p className="exhibition-date animate-on-scroll delay-400">8 MARCH - 10 MARCH 2025</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-200">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-2.jpg" alt="DESIGN WORKSHOP" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-300">DESIGN WORKSHOP</h2>
                <p className="product-period animate-on-scroll delay-400">EDUCATIONAL PROGRAM</p>
                <p className="exhibition-date animate-on-scroll delay-500">15 FEBRUARY - 18 FEBRUARY 2025</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-300">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-3.jpg" alt="RESTORATION TALK" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-400">RESTORATION TALK</h2>
                <p className="product-period animate-on-scroll delay-500">EXPERT LECTURE</p>
                <p className="exhibition-date animate-on-scroll delay-600">20 JANUARY - 21 JANUARY 2025</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-400">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-4.jpg" alt="COLLECTOR'S EVENING" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-500">COLLECTOR&#39;S EVENING</h2>
                <p className="product-period animate-on-scroll delay-600">VIP RECEPTION</p>
                <p className="exhibition-date animate-on-scroll delay-700">12 DECEMBER - 12 DECEMBER 2024</p>
              </div>
            </Link>
          </div>
          
          {/* Second Row: 4 Images */}
          <div className="product-item animate-on-scroll delay-100">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-5.jpg" alt="ARTISAN MARKET" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-200">ARTISAN MARKET</h2>
                <p className="product-period animate-on-scroll delay-300">WEEKEND SHOWCASE</p>
                <p className="exhibition-date animate-on-scroll delay-400">5 OCTOBER - 6 OCTOBER 2024</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-200">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-6.jpg" alt="DESIGN DIALOGUE" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-300">DESIGN DIALOGUE</h2>
                <p className="product-period animate-on-scroll delay-400">PANEL DISCUSSION</p>
                <p className="exhibition-date animate-on-scroll delay-500">18 SEPTEMBER - 19 SEPTEMBER 2024</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-300">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-7.jpg" alt="SUMMER SOCIAL" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-400">SUMMER SOCIAL</h2>
                <p className="product-period animate-on-scroll delay-500">NETWORKING EVENING</p>
                <p className="exhibition-date animate-on-scroll delay-600">25 JULY - 25 JULY 2024</p>
              </div>
            </Link>
          </div>
          <div className="product-item animate-on-scroll delay-400">
            <Link href="/event-details-past" className="product-link">
              <div className="product-image">
                <Image src="/assets/images/Exhibitions-8.jpg" alt="HERITAGE WORKSHOP" width={400} height={400} style={{aspectRatio: '1/1', objectFit: 'cover'}} />
              </div>
              <div className="product-info">
                <h2 className="product-title animate-on-scroll delay-500">HERITAGE WORKSHOP</h2>
                <p className="product-period animate-on-scroll delay-600">TRADITIONAL CRAFTS</p>
                <p className="exhibition-date animate-on-scroll delay-700">10 JUNE - 12 JUNE 2024</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
} 