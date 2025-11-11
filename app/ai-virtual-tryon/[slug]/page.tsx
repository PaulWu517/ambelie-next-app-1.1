'use client';

import React, { useEffect, useState, useRef } from 'react';
import { applyPoseWarpToDataUrl } from '@/lib/vision/poseWarp';
import { useParams, useSearchParams } from 'next/navigation';
import { compressImage } from '@/lib/utils/imageCompression';
 
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
  const [productName, setProductName] = useState<string | null>(null);
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
        setProductName(prod.name || null);
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
  const [showImageModal, setShowImageModal] = useState(false);
  const baseResultRef = useRef<string | null>(null);
  const centerPanelRef = useRef<HTMLDivElement | null>(null);
  const resultAreaRef = useRef<HTMLDivElement | null>(null);
  const defaultWarp = { hip: 0, waist: 0, shoulder: 0, thigh: 0, upper_arm: 0, forearm: 0, calf: 0 };
  const [warpControls, setWarpControls] = useState(defaultWarp);
  const warpDebounce = useRef<number | null>(null);

  const toBlobFromDataUrl = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const blobToDataUrl = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
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

  // 图片放大功能
  const handleImageClick = () => {
    if (resultUrl) {
      setShowImageModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowImageModal(false);
  };

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImageModal) {
        setShowImageModal(false);
      }
    };

    if (showImageModal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 防止背景滚动
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);

  const handleUserUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUserPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Drag-and-drop support for user photo upload
  const [isUserDragActive, setIsUserDragActive] = useState(false);
  const handleUserDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(true);
  };
  const handleUserDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(true);
  };
  const handleUserDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(false);
  };
  const handleUserDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(false);
    const file = e.dataTransfer.files?.[0];
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
    const traceId = `slug-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const diag = (stage: string, message?: any, extra?: any) => {
      try {
        const payload = { traceId, stage, message, ts: new Date().toISOString(), extra };
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon('/api/diagnostic', blob);
        } else {
          void fetch('/api/diagnostic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(() => {});
        }
      } catch {}
    };
    setProcessingProgress(0);
    diag('request-start', { mode, refUrl });
    
    // Mobile only: auto-scroll to Try-On Result to reveal progress UI
    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          console.log('[slug tryon] Mobile detected, scrolling to result area');
          const targetElement = centerPanelRef.current || resultAreaRef.current;
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('[slug tryon] Scroll initiated');
          } else {
            console.log('[slug tryon] Target element not found');
          }
        }
      } catch (e) {
        console.warn('[slug tryon] Scroll failed:', e);
      }
    }, 100);
    
    if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    {
      const start = Date.now();
      const rampDuration = 20000; // reach 99% in 20s then tail wait
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
      const originalFile = new File([userBlob], mode === 'outfit' ? 'user-fullbody.jpg' : 'user-headshot.jpg', { type: userBlob.type || 'image/jpeg' });

      // 云端限制保护：仅当超限时进行轻量压缩（默认阈值 ≈ 9.5MB）
      const MAX_MB = 9.5;
      let userFile = originalFile;
      if (userFile.size > MAX_MB * 1024 * 1024) {
        try {
          const compressed = await compressImage(userFile, { maxWidth: 2048, maxHeight: 2048, quality: 0.9, outputFormat: 'jpeg' });
          console.log('[slug tryon] image compressed due to size', { before: userFile.size, after: compressed.size });
          userFile = compressed;
        } catch (e) {
          console.warn('[slug tryon] compress failed, using original', e);
        }
      }
      console.log('[slug tryon] image prepared', { size: userFile.size });
      // 不再在前端抓取参考图，改为传 URL 由后端拉取，避免跨域
      const formData = new FormData();
      formData.append('user_image', userFile);
      formData.append('model_image_url', refUrl);
      formData.append('measurements', JSON.stringify(null));
      formData.append('prompt', mode === 'outfit' ? (fashionPrompt || '') : (modelPrompt || ''));
      formData.append('traceId', traceId);

      console.log('[slug tryon] posting', { mode, refUrl, prompt: mode === 'outfit' ? (fashionPrompt || '') : (modelPrompt || '') });
      diag('api-call');
      const postRespPromise = fetch('/api/virtual-tryon', { method: 'POST', body: formData });
      // 两阶段流程：通过 HEAD 轮询结果是否可读（动态间隔）
      diag('head-poll-start');
      const deadlineMs = 60_000;
      const pollStart = Date.now();
      let foundExt: 'png' | 'jpg' | null = null;
      while (!foundExt && (Date.now() - pollStart) < deadlineMs) {
        const head = await fetch(`/api/virtual-tryon/result/${traceId}`, { method: 'HEAD', cache: 'no-store' });
        if (head.ok) {
          foundExt = (head.headers.get('X-Found-Ext') as any) || 'png';
          diag('head-200', { ext: foundExt });
          break;
        }
        const elapsed = Date.now() - pollStart;
        const interval = elapsed < 20_000 ? 1200 : 700;
        await new Promise(r => setTimeout(r, interval));
      }
      if (!foundExt) {
        diag('head-timeout');
        throw new Error('Timeout waiting for result image');
      }
      // CDN 直链优先，代理回退
      const cdnBase = (process.env.NEXT_PUBLIC_TENCENT_COS_CDN_DOMAIN || 'https://media.ambelie.com').replace(/\/$/, '');
      const basePath = (process.env.NEXT_PUBLIC_TRYON_COS_BASE_PATH || 'tryon-results/').replace(/\/?$/, '/');
      const cdnUrl = `${cdnBase}/${basePath}${traceId}.${foundExt}`;
      diag('download-start', { cdnUrl });
      let imgResp = await fetch(cdnUrl, { cache: 'no-store' });
      if (!imgResp.ok) {
        diag('download-fallback-proxy', { status: imgResp.status });
        const proxyUrl = `/api/virtual-tryon/result/${traceId}?ext=${foundExt}`;
        imgResp = await fetch(proxyUrl, { cache: 'no-store' });
        if (!imgResp.ok) {
          const txt = await imgResp.clone().text().catch(() => '');
          throw new Error(`Result fetch failed: ${imgResp.status} ${txt}`);
        }
      }
      diag('download-success', { status: imgResp.status });
      const blob = await imgResp.blob();
      diag('api-blob-success', { size: blob.size, type: blob.type });
      // 先用 Blob URL 即显，提升体感速度
      const objUrl = URL.createObjectURL(blob);
      setResultUrl(objUrl);
      setShowResult(true);
      diag('dataurl-start');
      const baseDataUrl = await blobToDataUrl(blob);
      diag('dataurl-success', { length: baseDataUrl.length });
      baseResultRef.current = baseDataUrl;
      let adjustedUrl = baseDataUrl;
      try {
        diag('posewarp-start');
        adjustedUrl = await applyPoseWarpToDataUrl(baseDataUrl, warpControls, { showKeypoints: false });
        diag('posewarp-success');
      } catch (e) {
        console.warn('[slug tryon] pose warp failed', e);
        diag('posewarp-error', String(e));
      }
      URL.revokeObjectURL(objUrl);
      setResultUrl(adjustedUrl);
      setShowResult(true);
      diag('render-success');
    } catch (err) {
      console.error('[slug tryon] error', err);
      try { await fetch('/api/diagnostic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ traceId, stage: 'error', message: (err instanceof Error ? err.message : String(err)), ts: new Date().toISOString() }) }); } catch {}
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
      {/* Header removed per requirement: no top textual description */}

      <div className={styles.mainContent}>
        <div className={styles.leftPanel}>
          <h2 className={styles.sectionTitle}>{mode === 'outfit' ? 'Upload Your Full-body Shot' : 'Upload Your Headshot'}</h2>
          <div className={styles.uploadSection}>
            <label
              htmlFor="userUpload"
              className={`${styles.uploadArea} ${isUserDragActive ? styles.uploadAreaDragActive : ''}`}
              onDragOver={handleUserDragOver}
              onDragEnter={handleUserDragEnter}
              onDragLeave={handleUserDragLeave}
              onDrop={handleUserDrop}
            >
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
              <h3 style={{ marginBottom: 8, fontWeight: 400 }}>{productName || 'Product'}</h3>
              <div className={styles.productImageArea}>
                {fashionUrl ? (
                  <img src={fashionUrl} alt={productName || 'Product'} className={`${styles.uploadedImage} ${styles.modelRefImage}`} />
                ) : (
                  <div className={styles.uploadPlaceholder}>No product image available</div>
                )}
              </div>
            </div>
          )}

          {mode === 'headshot' && (
            <div className={styles.uploadSection}>
              <h3 style={{ marginBottom: 8, fontWeight: 400 }}>{productName || 'Product'}</h3>
              <div className={styles.productImageArea}>
                {fashionUrl ? (
                  <img src={fashionUrl} alt={productName || 'Product'} className={`${styles.uploadedImage} ${styles.modelRefImage}`} />
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
              {isProcessing
                ? 'Processing...'
                : (resultUrl ? 'Try On Again' : 'Try On Now')}
            </button>
          </div>
        </div>

        <div className={styles.centerPanel} ref={centerPanelRef}>
          <h2 className={styles.sectionTitle}>Ai Try-On Result</h2>
          <div className={styles.resultArea} ref={resultAreaRef}>
            {isProcessing ? (
              <div className={styles.processing}>
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${processingProgress}%` }} />
                  </div>
                  <div className={styles.progressText}>
                    <span className={styles.progressPercent}>{processingProgress}%</span>
                    <span className={styles.progressEta}>{processingProgress >= 99 ? 'Finalizing...' : `~${Math.max(0, 20 - Math.round((processingProgress / 100) * 20))}s remaining`}</span>
                  </div>
                  <p className={styles.processingHint}>Generating high-fidelity try-on image...</p>
                </div>
              </div>
            ) : resultUrl ? (
              <div className={styles.result}>
                <img 
                  src={resultUrl} 
                  alt="Try-on result" 
                  className={styles.resultImage} 
                  onClick={handleImageClick}
                  style={{ cursor: 'pointer' }}
                  title="点击放大查看"
                />
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
                { key: 'shoulder', label: 'Shoulder Width' },
                { key: 'upper_arm', label: 'Upper Arm Width' },
                { key: 'waist', label: 'Waist Width' },
                { key: 'forearm', label: 'Forearm Width' },
                { key: 'hip', label: 'Hip Width' },
                { key: 'thigh', label: 'Thigh Width' },
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

      {/* 图片放大模态框 */}
      {showImageModal && resultUrl && (
        <div className={styles.imageModal} onClick={handleCloseModal}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={handleCloseModal}>
              ×
            </button>
            <img 
              src={resultUrl} 
              alt="Try-on result - enlarged" 
              className={styles.enlargedImage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SlugTryOnPage;