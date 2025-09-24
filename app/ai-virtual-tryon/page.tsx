'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './VirtualTryOn.module.css';

interface BodyMeasurements {
  height: number;
  weight: number;
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  arms: number;
  legs: number;
}

const VirtualTryOnPage: React.FC = () => {
  // Hide header on this page
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      header.style.display = 'none';
    }
    
    return () => {
      // Restore header when leaving the page
      const header = document.querySelector('header');
      if (header) {
        header.style.display = '';
      }
    };
  }, []);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedClothing, setUploadedClothing] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<string | null>(null);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurements>({
    height: 170,
    weight: 60,
    shoulders: 40,
    chest: 90,
    waist: 75,
    hips: 95,
    arms: 60,
    legs: 100
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);
  const resultInputRef = useRef<HTMLInputElement>(null);

  const clothingOptions = [
    { id: 'dress1', name: 'Elegant Evening Dress', image: '/assets/clothing/dress1.jpg' },
    { id: 'jacket1', name: 'Classic Blazer', image: '/assets/clothing/jacket1.jpg' },
    { id: 'shirt1', name: 'Silk Blouse', image: '/assets/clothing/shirt1.jpg' },
    { id: 'pants1', name: 'Tailored Trousers', image: '/assets/clothing/pants1.jpg' }
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClothingUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedClothing(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResultUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedResult(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMeasurementChange = (key: keyof BodyMeasurements, value: number) => {
    setBodyMeasurements(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTryOn = async () => {
    if (!uploadedImage || !uploadedClothing) return;
    
    setIsProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      setShowResult(true);
    }, 3000);
  };

  const resetAll = () => {
    setUploadedImage(null);
    setUploadedClothing(null);
    setUploadedResult(null);
    setShowResult(false);
    setBodyMeasurements({
      height: 170,
      weight: 60,
      shoulders: 40,
      chest: 90,
      waist: 75,
      hips: 95,
      arms: 60,
      legs: 100
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Virtual Try-On</h1>
        <p className={styles.subtitle}>
          Experience the future of fashion with our advanced AI technology. 
          Upload your photo and adjust your body measurements for the perfect fit.
        </p>
      </div>

      <div className={styles.mainContent}>
        {/* Left Panel - Image Upload & Clothing Selection */}
        <div className={styles.leftPanel}>
          <div className={styles.uploadSection}>
            <h2 className={styles.sectionTitle}>Upload Your Photo</h2>
            <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
              {uploadedImage ? (
                <img src={uploadedImage} alt="Uploaded" className={styles.uploadedImage} />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <div className={styles.uploadIcon}>📷</div>
                  <p>Click to upload your full-body photo</p>
                  <span className={styles.uploadHint}>Recommended: Front-facing, good lighting</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className={styles.hiddenInput}
            />
          </div>

          <div className={styles.clothingSection}>
            <h2 className={styles.sectionTitle}>Clothing Image</h2>
            <div className={styles.uploadArea} onClick={() => clothingInputRef.current?.click()}>
              {uploadedClothing ? (
                <img src={uploadedClothing} alt="Uploaded Clothing" className={styles.uploadedImage} />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <div className={styles.uploadIcon}>👕</div>
                  <p>Click to upload clothing image</p>
                  <span className={styles.uploadHint}>Recommended: Clear clothing photo</span>
                </div>
              )}
            </div>
            <input
              ref={clothingInputRef}
              type="file"
              accept="image/*"
              onChange={handleClothingUpload}
              className={styles.hiddenInput}
            />
          </div>
        </div>

        {/* Center Panel - Body Measurements Adjustment */}
        <div className={styles.centerPanel}>
          <h2 className={styles.sectionTitle}>Adjust Body Measurements</h2>
          <div className={styles.measurementsContainer}>
            <div className={styles.sliders}>
              {Object.entries(bodyMeasurements).map(([key, value]) => (
                <div key={key} className={styles.sliderGroup}>
                  <label className={styles.sliderLabel}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <span className={styles.sliderValue}>
                      {value}{key === 'height' ? 'cm' : key === 'weight' ? 'kg' : '%'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={key === 'height' ? 150 : key === 'weight' ? 40 : 20}
                    max={key === 'height' ? 200 : key === 'weight' ? 120 : 120}
                    value={value}
                    onChange={(e) => handleMeasurementChange(key as keyof BodyMeasurements, parseInt(e.target.value))}
                    className={styles.slider}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Result & Actions */}
        <div className={styles.rightPanel}>
          <h2 className={styles.sectionTitle}>Try-On Result</h2>
          <div className={styles.resultArea}>
            {isProcessing ? (
              <div className={styles.processing}>
                <div className={styles.spinner}></div>
                <p>AI is processing your virtual try-on...</p>
              </div>
            ) : showResult || uploadedResult ? (
              <div className={styles.resultArea}>
                {uploadedResult ? (
                  <img 
                    src={uploadedResult} 
                    alt="Try-on result" 
                    className={styles.resultImage}
                  />
                ) : showResult ? (
                  <img 
                    src="/api/placeholder/300/400" 
                    alt="Try-on result" 
                    className={styles.resultImage}
                  />
                ) : (
                  <div 
                    className={styles.resultPlaceholder}
                    onClick={() => resultInputRef.current?.click()}
                  >
                    <p>Click to upload your own result image</p>
                    <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                      Or click "Try On Now" to generate AI result
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  ref={resultInputRef}
                  onChange={handleResultUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className={styles.resultPlaceholder} onClick={() => resultInputRef.current?.click()}>
                <div className={styles.uploadIcon}>🖼️</div>
                <p>Upload result image or try on to see the magic happen!</p>
                <span className={styles.uploadHint}>Click to upload your own result image</span>
              </div>
            )}
          </div>
          <input
            ref={resultInputRef}
            type="file"
            accept="image/*"
            onChange={handleResultUpload}
            className={styles.hiddenInput}
          />

          <div className={styles.actionButtons}>
            <button
              className={styles.tryOnButton}
              onClick={handleTryOn}
              disabled={!uploadedImage || !uploadedClothing || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Try On Now'}
            </button>
            <button className={styles.resetButton} onClick={resetAll}>
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>Why Choose Our AI Virtual Try-On?</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🎯</div>
            <h3>Precise Fit</h3>
            <p>Advanced AI algorithms ensure accurate body measurements and realistic clothing fit.</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Instant Results</h3>
            <p>Get your virtual try-on results in seconds with our optimized processing engine.</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔒</div>
            <h3>Privacy Protected</h3>
            <p>Your photos are processed securely and never stored on our servers.</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📱</div>
            <h3>Mobile Friendly</h3>
            <p>Works seamlessly across all devices - desktop, tablet, and mobile.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOnPage;