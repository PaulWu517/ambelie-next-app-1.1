'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './HangzhouShowroom.module.css';

// 元数据定义
// export const metadata = {
//   title: "Ambelie Hangzhou | Showroom",
//   description: "Discover AMBELIE Hangzhou showroom at Hongning Road, where French elegance meets Chinoiserie style in our thoughtfully designed spaces.",
// };

export default function HangzhouShowroomPage() {
  const spaces = [
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

  const animatedElementsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.animated);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    const currentElements = animatedElementsRef.current;
    currentElements.forEach((el) => {
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      currentElements.forEach((el) => {
        if (el) {
          observer.unobserve(el);
        }
      });
    };
  }, []);

  const addToRefs = (el: HTMLDivElement | null) => {
    if (el && !animatedElementsRef.current.includes(el)) {
      animatedElementsRef.current.push(el);
    }
  };

  return (
    <main className={styles.container}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroImageContainer}>
          <Image
            src="/assets/hangzhou/hero-image.jpg"
            alt="AMBELIE Hangzhou Showroom"
            width={1200}
            height={800}
            style={{ objectFit: 'cover' }}
            priority
          />
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>AMBELIE HANGZHOU</h1>
              <div className={styles.heroInfo}>
                <p className={styles.address}>No. 1788 Hongning Road, Xiaoshan District</p>
                <p className={styles.hours}>Opening Hours: 10:00-20:00</p>
              </div>
            </div>
          </div>
        </div>
        
        <div 
          className={styles.heroDescription}
          ref={addToRefs}
        >
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
        </div>
      </section>

      {/* Spaces Sections */}
      {spaces.map((space, index) => (
        <section key={space.id} className={`${styles.spaceSection} ${index % 2 === 1 ? styles.reversed : ''}`}>
          <div 
            className={styles.spaceImages}
            ref={addToRefs}
          >
            <div className={styles.imageGrid}>
              {space.images.map((imageSrc, imgIndex) => (
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
          <h2 className={styles.contactTitle}>VISIT OUR SHOWROOM</h2>
          <p className={styles.contactDescription}>
            Experience our curated collection in person. Private appointments are available for personalized consultations.
          </p>
          <div className={styles.contactInfo}>
            <p><strong>Address:</strong> No. 1788 Hongning Road, Xiaoshan District, Hangzhou</p>
            <p><strong>Hours:</strong> 10:00-20:00, Daily</p>
            <p><strong>Contact:</strong> For appointments and inquiries</p>
          </div>
        </div>
      </section>
    </main>
  );
} 