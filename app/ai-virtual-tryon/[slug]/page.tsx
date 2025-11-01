'use client';

import React, { useEffect, useState, useRef } from 'react';
import { applyPoseWarpToDataUrl } from '@/lib/vision/poseWarp';
import { useParams, useSearchParams } from 'next/navigation';
import styles from '../VirtualTryOn.module.css';

const SlugTryOnPage: React.FC = () => {
  // Hide header on this page for focused experience
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) header.style.display = 'none';
    return () => { if (header) header.style.display = ''; };
  }, []);

  const params = useParams();
  const search = useSearchParams();
  const slug = params?.slug as string;
  const mode = (search.get('mode') || 'outfit') as 'outfit' | 'headshot';
  const fashionUrl = search.get('fashion');
  const modelUrl = search.get('model');
  // Fetch prompts from backend fields depending on slug
  const [fashionPrompt, setFashionPrompt] = useState<string | null>(null);
  const [modelPrompt, setModelPrompt] = useState<string | null>(null);
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
    if (!slug) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}`, { cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) return;
        const json = await res.json();
        const item = json?.data?.[0];
        if (!item) return;
        const prod = item.attributes ? item.attributes : item;
        setFashionPrompt(prod.fashionPrompt || null);
        setModelPrompt(prod.modelPrompt || null);
      } catch (e) {
        console.warn('[slug tryon] fetch prompts failed', e);
      }
    };
    run();
    return () => controller.abort();
  }, [slug]);
  const [userPreview, setUserPreview] = useState<string | null>(null);
  // New states for AI result and controls
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const baseResultRef = useRef<string | null>(null);
  const defaultWarp = { hip: 0, waist: 0, shoulder: 0, thigh: 0, upper_arm: 0, forearm: 0, calf: 0 };
  const [warpControls, setWarpControls] = useState(defaultWarp);
  const warpDebounce = useRef<number | null>(null);

  const toBlobFromDataUrl = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleDownloadResult = async () => {
    if (!resultUrl) return;
    setIsDownloading(true);
    try {
      const blob = await toBlobFromDataUrl(resultUrl);
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('jpeg') ? 'jpg' : 'png';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tryon-result.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[slug tryon] download failed', e);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareResult = async () => {
    if (!resultUrl) return;
    setIsSharing(true);
    try {
      const blob = await toBlobFromDataUrl(resultUrl);
      const file = new File([blob], 'tryon-result.png', { type: blob.type || 'image/png' });
      const navAny = navigator as any;
      if (navAny.canShare?.({ files: [file] })) {
        await navAny.share({ files: [file], title: 'Ambelie Try-On Result' });
        return;
      }
      if (navAny.clipboard?.write) {
        try {
          await navAny.clipboard.write([new (window as any).ClipboardItem({ [blob.type || 'image/png']: blob })]);
          alert('Image copied to clipboard.');
          return;
        } catch {}
      }
      await navAny.clipboard?.writeText(resultUrl);
      alert('Result URL copied to clipboard.');
    } catch (e) {
      console.warn('[slug tryon] share failed', e);
      alert('Share failed. You can download and share manually.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUserUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUserPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Removed: goToBeta (no longer needed per design)

  const handleTryOn = async () => {
    if (!userPreview) {
      alert('Please upload your photo first.');
      return;
    }
    const refUrl = mode === 'outfit' ? fashionUrl : modelUrl;
    if (!refUrl) {
      alert('Missing product reference image for this mode.');
      return;
    }
    setIsProcessing(true);
    setProcessingProgress(0);
    if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    {
      const start = Date.now();
      const rampDuration = 15000; // reach 99% then tail wait
      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(99, Math.round((elapsed / rampDuration) * 99));
        setProcessingProgress(pct);
      }, 100);
    }
    try {
      const toBlob = async (urlOrDataUrl: string) => {
        const res = await fetch(urlOrDataUrl);
        return await res.blob();
      };
      const userBlob = await toBlob(userPreview);
      const userFile = new File([userBlob], mode === 'outfit' ? 'user-fullbody.jpg' : 'user-headshot.jpg', { type: userBlob.type || 'image/jpeg' });
      // 不再在前端抓取参考图，改为传 URL 由后端拉取，避免跨域
      const formData = new FormData();
      formData.append('user_image', userFile);
      formData.append('model_image_url', refUrl);
      formData.append('measurements', JSON.stringify(null));
      formData.append('prompt', mode === 'outfit' ? (fashionPrompt || '') : (modelPrompt || ''));

      console.log('[slug tryon] posting', { mode, refUrl, prompt: mode === 'outfit' ? (fashionPrompt || '') : (modelPrompt || '') });
       const resp = await fetch('/api/virtual-tryon', { method: 'POST', body: formData });
      if (!resp.ok) {
        let detail: any = null;
        try { detail = await resp.json(); } catch { detail = await resp.text(); }
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      const json = await resp.json();
      const mime = json?.mimeType || 'image/png';
      const baseDataUrl = `data:${mime};base64,${json?.imageBase64}`;
      baseResultRef.current = baseDataUrl;
      let adjustedUrl = baseDataUrl;
      try {
        adjustedUrl = await applyPoseWarpToDataUrl(baseDataUrl, warpControls, { showKeypoints: false });
      } catch (e) {
        console.warn('[slug tryon] pose warp failed', e);
      }
      setResultUrl(adjustedUrl);
      setShowResult(true);
    } catch (err) {
      console.error('[slug tryon] error', err);
      alert('Failed to generate: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProcessingProgress(100);
      setIsProcessing(false);
    }
  };

  const applyWarpFromControls = async () => {
    if (!baseResultRef.current) return;
    try {
      const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, warpControls, { showKeypoints: false });
      setResultUrl(adjusted);
    } catch (e) {
      console.warn('[slug tryon] apply warp failed', e);
    }
  };

  const handleResetMeasurements = async () => {
    setIsResetting(true);
    try {
      setWarpControls(defaultWarp);
      if (baseResultRef.current) {
        const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, defaultWarp, { showKeypoints: false });
        setResultUrl(adjusted);
      }
    } catch (e) {
      console.warn('[slug tryon] reset apply failed', e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleApplyMeasurements = async () => {
    if (!baseResultRef.current) return;
    setIsApplying(true);
    try {
      await applyWarpFromControls();
    } catch (e) {
      console.warn('[slug tryon] apply measurements failed', e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleControlChange = (key: keyof typeof warpControls, value: number) => {
    setWarpControls(prev => ({ ...prev, [key]: value }));
    if (warpDebounce.current) window.clearTimeout(warpDebounce.current);
    warpDebounce.current = window.setTimeout(applyWarpFromControls, 80);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Virtual Try-On</h1>
        <p className={styles.subtitle}>
          Product: {slug} | Mode: {mode === 'outfit' ? 'Outfit Try-On (Full-Body Photo)' : 'Headshot to Model Photo'}
        </p>
        <a href={`/products/${slug}`} style={{ display: 'inline-block', marginTop: 10, color: '#333' }}>Back to Product Details</a>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.leftPanel}>
          <h2 className={styles.sectionTitle}>Upload & Preview</h2>
          <div className={styles.uploadSection}>
            <label htmlFor="userUpload" className={styles.uploadArea}>
              {userPreview ? (
                <img src={userPreview} className={styles.uploadedImage} alt="User Preview" />
              ) : (
                <>
                  <img src="/assets/icon/上传.png" alt="Upload" className={`${styles.uploadIcon} ${styles.uploadIconImage}`} />
                  <span>Click or drag to upload {mode === 'outfit' ? 'a full-body photo' : 'a headshot'}</span>
                  <span className={styles.uploadHint}>Supports JPG/PNG. Prefer clear images without obstructions.</span>
                </>
              )}
              <input id="userUpload" type="file" accept="image/*" className={styles.hiddenInput} onChange={handleUserUpload} />
            </label>
          </div>

          {mode === 'outfit' && (
            <div className={styles.uploadSection}>
              <h3 style={{ marginBottom: 8 }}>Outfit Reference (from product)</h3>
              {fashionUrl ? (
                <img src={fashionUrl} alt="Fashion" className={styles.uploadedImage} />
              ) : (
                <div className={styles.uploadPlaceholder}>No outfit reference available</div>
              )}
            </div>
          )}

          {mode === 'headshot' && (
            <div className={styles.uploadSection}>
              <h3 style={{ marginBottom: 8, fontWeight: 400 }}>Product Image</h3>
              <div className={styles.productImageArea}>
                {fashionUrl ? (
                  <img src={fashionUrl} alt="Product Image" className={`${styles.uploadedImage} ${styles.modelRefImage}`} />
                ) : (
                  <div className={styles.uploadPlaceholder}>No product image available</div>
                )}
              </div>
            </div>
          )}

          <div className={styles.resultActions}>
            <button
              onClick={handleTryOn}
              className="submit-button"
              disabled={isProcessing || !userPreview || !(mode === 'outfit' ? fashionUrl : modelUrl)}
              aria-busy={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Try On Now'}
            </button>
          </div>
        </div>

        <div className={styles.centerPanel}>
          <h2 className={styles.sectionTitle}>Try-On Result</h2>
          <div className={styles.resultArea}>
            {isProcessing ? (
              <div className={styles.processing}>
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${processingProgress}%` }} />
                  </div>
                  <div className={styles.progressText}>
                    <span className={styles.progressPercent}>{processingProgress}%</span>
                    <span className={styles.progressEta}>{processingProgress >= 99 ? 'Finalizing...' : `~${Math.max(0, 15 - Math.round((processingProgress / 100) * 15))}s remaining`}</span>
                  </div>
                  <p className={styles.processingHint}>Generating high-fidelity try-on image...</p>
                </div>
              </div>
            ) : resultUrl ? (
              <div className={styles.result}>
                <img src={resultUrl} alt="Try-on result" className={styles.resultImage} />
              </div>
            ) : (
              <div className={styles.resultPlaceholder}>
                <img src="/assets/icon/图片.png" alt="Image icon" className={styles.resultIcon} />
                <p>Your result will appear here after generation.</p>
                <span className={styles.uploadHint}>Click "Try On Now" to generate</span>
              </div>
            )}
          </div>
          <div className={styles.resultActions}>
            <button className="submit-button" onClick={handleDownloadResult} disabled={!resultUrl || isDownloading} aria-busy={isDownloading}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
            <button className="submit-button" onClick={handleShareResult} disabled={!resultUrl || isSharing} aria-busy={isSharing}>
              {isSharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <h2 className={styles.sectionTitle}>Adjust Body Measurements</h2>
          <div className={styles.measurementsContainer}>
            <div className={styles.sliders}>
              {[
                { key: 'hip', label: 'Hip Width' },
                { key: 'waist', label: 'Waist Width' },
                { key: 'shoulder', label: 'Shoulder Width' },
                { key: 'thigh', label: 'Thigh Width' },
                { key: 'upper_arm', label: 'Upper Arm Width' },
                { key: 'forearm', label: 'Forearm Width' },
                { key: 'calf', label: 'Calf Width' },
              ].map(({ key, label }) => (
                <div key={key} className={styles.sliderGroup}>
                  <label className={styles.sliderLabel}>
                    {label}
                    <span className={styles.sliderValue}>{(warpControls as any)[key]}%</span>
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={(warpControls as any)[key]}
                    onChange={(e) => handleControlChange(key as keyof typeof warpControls, parseInt(e.target.value))}
                    className={styles.slider}
                  />
                </div>
              ))}
            </div>
            <div className={styles.resultActions}>
              <button
                className="submit-button"
                onClick={handleResetMeasurements}
                disabled={isResetting || !baseResultRef.current}
                aria-busy={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset'}
              </button>
              <button
                className="submit-button"
                onClick={handleApplyMeasurements}
                disabled={isApplying || !baseResultRef.current}
                aria-busy={isApplying}
              >
                {isApplying ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlugTryOnPage;