"use client";

import React, { useEffect, useState } from 'react';
import Script from 'next/script';

interface VRClientProps {
  product: {
    id: number;
    name: string;
    slug: string;
    vrModelUrl?: string;
    vrUsdzUrl?: string;
    mainImageUrl?: string;
  } | null;
}

export default function VRClient({ product }: VRClientProps) {
  const hasModel = Boolean(product?.vrModelUrl || product?.vrUsdzUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const isIOS = () =>
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));
  const iosUsdzUrl = (() => {
    const explicit = (product?.vrUsdzUrl || '').trim();
    if (explicit) return explicit;
    const src = (product?.vrModelUrl || '').trim();
    if (!src) return '';
    if (src.endsWith('.usdz')) return src;
    const dot = src.lastIndexOf('.');
    if (dot === -1) return '';
    return src.slice(0, dot) + '.usdz';
  })();

  useEffect(() => {
    const el = document.querySelector('model-viewer') as any;
    if (!el) return;
    setIsLoading(true);
    setProgress(0);
    const onLoad = () => {
      setIsLoading(false);
      setProgress(1);
    };
    const onError = () => setIsLoading(false);
    const onProgress = (e: any) => {
      const p = e?.detail?.totalProgress;
      if (typeof p === 'number') {
        setProgress(Math.min(Math.max(p, 0), 1));
      }
    };
    el.addEventListener('load', onLoad);
    el.addEventListener('error', onError);
    el.addEventListener('progress', onProgress);
    // Fallback: if no progress event, show indeterminate progress until load
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 0.9 ? Math.min(prev + 0.05, 0.9) : prev));
    }, 300);
    return () => {
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
      el.removeEventListener('progress', onProgress);
      clearInterval(timer);
    };
  }, [product?.vrModelUrl, product?.vrUsdzUrl]);

  return (
    <div style={{ background: '#f0f0f0', minHeight: '100vh' }}>
      <Script type="module" src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js" strategy="beforeInteractive" />

      {!hasModel ? (
        <div style={{ color: '#880913', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>No VR model URL configured for this product.</div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
          <model-viewer
            suppressHydrationWarning
            src={product!.vrModelUrl}
            alt={product!.name}
            camera-controls
            touch-action="pan-y"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ios-src={iosUsdzUrl || undefined}
            style={{ width: '100%', height: '100vh', background: '#f0f0f0' }}
          ></model-viewer>

          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 16 }}>
              Loading model...
            </div>
          )}

          <button
            id="ar-button"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 16,
              transform: 'translateX(-50%)',
              height: '40px',
              padding: '0 25px',
              background: isLoading ? 'transparent' : '#000',
              color: isLoading ? 'var(--brand-black)' : '#fff',
              border: '1px solid var(--brand-black)',
              borderRadius: 0,
              cursor: 'pointer',
              width: 'calc(100% - 32px)',
              maxWidth: 640,
              fontFamily: 'var(--font-body)',
              fontSize: '0.85em',
              fontWeight: 400,
              boxShadow: 'none',
              overflow: 'hidden'
            }}
            onClick={() => {
              const el = document.querySelector('model-viewer') as any;
              if (isIOS() && !iosUsdzUrl) {
                alert('iOS 设备的 AR 需要 USDZ 文件。当前模型未提供 USDZ，因此无法在 AR 中查看。');
                return;
              }
              if (el && typeof el.activateAR === 'function') {
                el.activateAR();
              }
            }}
          >
            {/* Dual-layer text to adapt color to background */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                zIndex: 2,
                clipPath: `inset(0 ${100 - Math.round(progress * 100)}% 0 0)`
              }}
            >
              AR View in your space
            </span>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-black)',
                zIndex: 2,
                clipPath: `inset(0 0 0 ${Math.round(progress * 100)}%)`
              }}
            >
              AR View in your space
            </span>
            {isLoading && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  background: 'var(--brand-black)',
                  width: `${Math.round(progress * 100)}%`,
                  transition: 'width 200ms ease',
                  zIndex: 1
                }}
              />
            )}
          </button>
        </div>
      )}
    </div>
  );
}