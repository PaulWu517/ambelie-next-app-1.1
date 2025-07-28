import Image from 'next/image';
import Link from 'next/link';
import ScrollAnimations from '../../components/ScrollAnimations';

export default function AboutPage() {
  return (
    <>
      {/* 
        在 Next.js App Router 中，<title> 和 <meta name="description"> 
        通常通过 Metadata API 在 page.tsx 或 layout.tsx 中定义。
        我们稍后会处理元数据。
      */}
      
      {/* Header 和 Footer 通常在根布局 (layout.tsx) 中处理，以保持一致性 */}
      {/* <Header /> */}

      <main className="about-page">
        <ScrollAnimations />
        {/* 首图区域 */}
        <section className="about-hero-section">
          <div className="about-hero-image">
            <Image 
              src="/assets/about_images/about_images-head.jpg" 
              alt="Ambelie About Hero" 
              fill={true} 
              style={{objectFit: 'cover', objectPosition: 'center'}}
              priority // 优先加载首屏图片
            />
          </div>
          <div className="about-hero-overlay">
            <div className="about-hero-content">
              <h1 className="about-hero-title animate-on-scroll">About Ambelie</h1>
              <p className="about-hero-subtitle animate-on-scroll delay-200">Beauty is what remains after time has washed away.</p>
            </div>
          </div>
        </section>

        {/* 正文内容区域 */}
        <section className="about-content-section">
          <div className="about-content-container">

            {/* 第一段图文：左文右图 */}
            <div className="about-image-text-block left-text">
              <div className="about-text-content animate-on-scroll slide-from-left">
                <h2 className="about-section-title">Our Global Journey</h2>
                <p className="about-paragraph">
                  AMBELIE is like a dreamscape that traverses time and space, crafting a fantastical world devoted to spatial aesthetics. We begin our journey in Asia, as pilgrims of art, traveling through the artistic sanctuaries of Europe and the cultural treasures of the Middle East. We gather timeless aesthetic treasures to weave an artistic, poetic space with historical resonance.
                </p>
                <p className="about-paragraph">
                  These masterpieces, hailing from diverse cultural backgrounds yet unified by their classic and enduring nature, come together to form a living space with an inherent aesthetic harmony—these scattered pearls from various civilizations, crafted by different masters, blend seamlessly, creating a subtle resonance and connection, and together they tell a shared philosophy of life.
                </p>
              </div>
              <div className="about-image-content animate-on-scroll slide-from-right delay-200">
                <Image src="/assets/about_images/about_images-1.jpg" alt="Ambelie Interior Design Philosophy" width={500} height={700} style={{width: '100%', height: 'auto', objectFit: 'cover'}} />
              </div>
            </div>

            {/* 第二段图文：右文左图 */}
            <div className="about-image-text-block right-text">
              <div className="about-text-content animate-on-scroll slide-from-right">
                <h2 className="about-section-title">Our Collection</h2>
                <p className="about-paragraph">
                  Here, each embroidered screen is akin to an elegant poem, and every piece of embroidery resembles a canvas painted by time, imbued with the fluidity and charm of Asian craftsmanship, gently whispering tales of stories and legends.
                </p>
                <p className="about-paragraph">
                  The deep elegance of Europe, the minimalist innovation of North America, and the enigmatic allure of the Middle East breathe a broader artistic vision into AMBELIE's space in Shanghai, where the subtle harmony and resonance between diverse cultures flow seamlessly. To look at a chair, a stone table, or any other object is to behold a sculpture, a chronicle, or a living plant.
                </p>
              </div>
              <div className="about-image-content animate-on-scroll slide-from-left delay-200">
                <Image src="/assets/about_images/about_images-2.jpg" alt="Ambelie Collection" width={500} height={700} style={{width: '100%', height: 'auto', objectFit: 'cover'}} />
              </div>
            </div>

            {/* 第三段图文：左文右图 */}
            <div className="about-image-text-block left-text">
              <div className="about-text-content animate-on-scroll slide-from-left">
                <h2 className="about-section-title">Our Mission</h2>
                <p className="about-paragraph">
                  AMBELIE brings together artworks, furniture, fashion, and interior design. We hold the belief that the true value of art's beauty is best revealed through its use, and that beauty enriched with time becomes more enduring.
                </p>
                <p className="about-paragraph">
                  Our mission is to bring these elements into the present, breathe new life into them, and shape our "self" within the material world we inhabit.
                </p>
              </div>
              <div className="about-image-content animate-on-scroll slide-from-right delay-200">
                <Image src="/assets/about_images/about_images-3.jpg" alt="Ambelie Mission" width={500} height={700} style={{width: '100%', height: 'auto', objectFit: 'cover'}} />
              </div>
            </div>

          </div>
        </section>
      </main>
      
      {/* <Footer /> */}
    </>
  );
}

// 添加元数据 (Metadata API)
export const metadata = {
  title: 'About Ambelie | Our Story, Mission, and Collection',
  description: 'Learn about Ambelie\'s journey in curating timeless antique furniture, modern designs, and art. Discover our mission to blend beauty, culture, and lifestyle.',
};