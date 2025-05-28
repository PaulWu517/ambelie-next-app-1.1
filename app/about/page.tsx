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

      <main>
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
                  Traveling through Europe, Asia, the Middle East, and North America, moving through more than 500 buying and antique stores, AMBELIE brings beauty across time, place, society, and lifestyle back to Shanghai & Hangzhou. Each piece in our collection tells a story of craftsmanship that transcends geographical boundaries, connecting diverse cultures through the universal language of exceptional design.
                </p>
                <p className="about-paragraph">
                  Under the plain white dome supported by Collins columns, the same classic and mid-century timeless furniture from different cultures build a living place with an implicit aesthetic. Order - the relics of various civilizations, born from the works of other masters, are so harmonious and integrated into the same room, creating a hidden resonance and connection.
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
                  AMBELIE is a collection of fashion, interior design, mid-century furniture, art, and lifestyle, where we believe that the beauty of art becomes more evident in its use and more solid with age. Every piece we curate has been chosen not just for its aesthetic appeal, but for its ability to enhance daily life while preserving the artisan's original vision and intent.
                </p>
                <p className="about-paragraph">
                  It speaks of a shared philosophy of life, where beauty becomes the common thread that unites disparate elements into a cohesive whole, creating spaces that inspire and elevate the human experience.
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
                  It is our mission to bring them into the present life, to give them a new lease of life, and to shape our "self" in the material environment. We believe that surrounding ourselves with objects of beauty and significance creates spaces that nurture creativity, inspire contemplation, and foster meaningful connections between past and present.
                </p>
                <p className="about-paragraph">
                  Through careful curation and thoughtful presentation, we aim to bridge the gap between historical significance and contemporary relevance, ensuring that each piece continues to tell its story while adapting to modern living.
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