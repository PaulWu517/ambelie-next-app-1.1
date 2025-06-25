'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './ShanghaiShowroom.module.css';

export default function ShanghaiShowroomPage() {
  const spaces = [
    {
      id: 'main-hall',
      title: 'MAIN HALL',
      subtitle: 'Timeless Dialogue',
      description: 'The main hall serves as the heart of the showroom, where classic mid-century furniture from different cultures engages in a silent, timeless dialogue under a plain white dome.',
      images: [
        '/assets/shanghai/main-hall-1.jpg',
        '/assets/shanghai/main-hall-2.jpg'
      ]
    },
    {
      id: 'green-room',
      title: 'GREEN ROOM',
      subtitle: 'A Nook of Serenity',
      description: 'The green room offers a tranquil corner for contemplation, featuring pieces that blend natural motifs with elegant design, creating an atmosphere of serene sophistication.',
      images: [
        '/assets/shanghai/green-room-1.jpg',
        '/assets/shanghai/green-room-2.jpg'
      ]
    },
    {
      id: 'entrance',
      title: 'ENTRANCE',
      subtitle: 'The First Glimpse',
      description: 'The entrance hall sets the tone for the Ambelie experience, where carefully selected art and furniture pieces provide a harmonious welcome to our world of curated beauty.',
      images: [
        '/assets/shanghai/entrance-1.jpg',
        '/assets/shanghai/entrance-2.jpg'
      ]
    },
    {
      id: 'side-hall',
      title: 'SIDE HALL',
      subtitle: 'Intimate Discoveries',
      description: 'A space designed for more intimate discoveries, the side hall showcases smaller furniture items and unique decorative objects that tell their own distinct stories.',
      images: [
        '/assets/shanghai/side-hall-1.jpg',
        '/assets/shanghai/side-hall-2.jpg'
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
            src="/assets/shanghai/hero-image.jpg"
            alt="AMBELIE Shanghai Showroom"
            width={1200}
            height={800}
            style={{ objectFit: 'cover' }}
            priority
          />
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>AMBELIE SHANGHAI</h1>
              <div className={styles.heroInfo}>
                <p className={styles.address}>No. 21, Kangping Road, Xuhui District</p>
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
              "Beauty is what remains after time has washed away." Traveling through Europe, Asia, the Middle East, and North America, moving through more than 500 buying and antique stores, AMBELIE brings beauty across time, place, society, and Lifestyle back to Shanghai & Hangzhou.
            </p>
            <p>
              Under the plain white dome supported by Collins columns, the same classic and timeless mid-century furniture from different cultures build a living place with an implicit aesthetic. Order - the relics of various civilizations, born from the works of other masters, are so harmonious and integrated Into the same room, creating a hidden resonance and connection. It speaks of a shared philosophy of life.
            </p>
            <p>
              AMBELIE is a collection of fashion, interior design, mid-century furniture, art, and lifestyle, where we believe that the beauty of art becomes more evident In its use and more solid with age, bringing it into the present and giving it a new lease of life, shaping our "self" In the physical environment. It is our mission to bring them into the present life, to give them a new lease of life, and to shape our "self" In the material environment.
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
            <p><strong>Address:</strong> No. 21, Kangping Road, Xuhui District, Shanghai</p>
            <p><strong>Hours:</strong> 10:00-20:00, Daily</p>
            <p><strong>Contact:</strong> For appointments and inquiries</p>
          </div>
        </div>
      </section>
    </main>
  );
} 