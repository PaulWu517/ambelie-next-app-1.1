'use client';

import React, { useEffect, useState, useRef } from 'react';
import { applyPoseWarpToDataUrl } from '@/lib/vision/poseWarp';
import { detectPoseLandmarksNormalized } from '@/lib/vision/poseWarp';
import { useParams, useSearchParams } from 'next/navigation';
import { compressImage } from '@/lib/utils/imageCompression';
 
import styles from '../VirtualTryOn.module.css';

const SlugTryOnPage: React.FC = () => {
  // UI诊断：统一将关键状态变化上报到后端终端日志，同时在浏览器控制台打印
  const uiTraceIdRef = useRef<string>(`slug-ui-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const emitUI = (stage: string, message?: any) => {
    try {
      const payload = { traceId: uiTraceIdRef.current, stage: `ui-${stage}`, message, ts: new Date().toISOString() };
      console.log(`[slug-ui] ${stage}`, message);
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        (navigator as any).sendBeacon('/api/diagnostic', blob);
      } else {
        void fetch('/api/diagnostic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
      }
    } catch {}
  };
  // Hide header on this page for focused experience
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) header.style.display = 'none';
    return () => { if (header) header.style.display = ''; };
  }, []);

  // 首次挂载打点
  useEffect(() => { emitUI('mount', { at: Date.now() }); }, []);

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
  // 结果待呈现状态：用于处理“生成完成但图片仍在下载/解码”的过渡期
  const [isResultPending, setIsResultPending] = useState(false);
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
  const cosPollTimerRef = useRef<number | null>(null);
  const cosPollAttemptsRef = useRef<number>(0);
  const lastTraceIdRef = useRef<string | null>(null);
  const [isCosPolling, setIsCosPolling] = useState(false);
  useEffect(() => {
    try {
      const el = resultAreaRef.current;
      if (el) {
        const cs = getComputedStyle(el);
        emitUI('resultArea-style', { position: cs.position, height: cs.height, width: cs.width });
      }
    } catch {}
  }, []);
  const defaultWarp = { hip: 0, waist: 0, shoulder: 0, thigh: 0, upper_arm: 0, forearm: 0, calf: 0 };
  const [warpControls, setWarpControls] = useState(defaultWarp);
  const warpDebounce = useRef<number | null>(null);
  const warpPreviewDebounce = useRef<number | null>(null);
  const warpFinalDebounce = useRef<number | null>(null);
  const poseLmsRef = useRef<Float32Array | null>(null);
  // 保持最新的滑杆值以避免定时器闭包读取旧值
  const warpControlsRef = useRef(warpControls);
  useEffect(() => { warpControlsRef.current = warpControls; }, [warpControls]);
  // 异步竞态保护：仅提交最新一次变形结果
  const applySeq = useRef(0);

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
    setIsResultPending(true);
    emitUI('tryon-start', { pending: true, resultUrl });
    setIsProcessing(true);
    setResultUrl(null);
    setShowResult(false);
    baseResultRef.current = null;
    setResultImgLoading(false);
    const traceId = `slug-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    lastTraceIdRef.current = traceId;
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
      const genResp = await fetch('/api/virtual-tryon', { method: 'POST', body: formData, headers: { Accept: 'application/json' } });
      // 记录响应元信息
      const contentType = genResp.headers.get('Content-Type') || genResp.headers.get('content-type');
      diag('server-response-meta', { status: genResp.status, contentType });
      let genData: any = null;
      // 二进制首帧：当返回的是图片时，直接读取 blob 并转换为 DataURL
      const isImage = !!contentType && contentType.toLowerCase().startsWith('image/');
      const isJson = !!contentType && contentType.toLowerCase().includes('application/json');
      if (genResp.ok && isImage) {
        const readStart = Date.now();
        diag('server-body-read-start');
        let blob: Blob;
        try {
          blob = await genResp.blob();
        } catch (e: any) {
          diag('server-body-read-error', e?.message || String(e));
          // 读取失败：结束处理态，避免卡住
          if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
          setProcessingProgress(100);
          setIsResultPending(false);
          setResultImgLoading(false);
          setIsProcessing(false);
          return;
        }
        diag('server-body-read-end', { durationMs: Date.now() - readStart, size: blob.size });
        // 先用 ObjectURL 即显，后台再转换为 DataURL（不主动 revoke，除非转换成功）
        const objUrl = URL.createObjectURL(blob);
        setResultImgLoading(true);
        setIsResultPending(true);
        emitUI('before-set-url', { urlKind: 'server-blob-objecturl' });
        setResultUrl(objUrl);
        setShowResult(true);
        if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
        setProcessingProgress(100);
        setIsProcessing(false);
        // 后台转换为 DataURL 并替换，确保后续处理一致
        (async () => {
          try {
            const reader = new FileReader();
            const dataUrl: string = await new Promise((resolve, reject) => { reader.onloadend = () => resolve(reader.result as string); reader.onerror = (e) => reject(e); reader.readAsDataURL(blob); });
            emitUI('after-objecturl-converted', { length: dataUrl.length });
            baseResultRef.current = dataUrl;
            setResultUrl(dataUrl);
            try { URL.revokeObjectURL(objUrl); } catch {}
            try {
              const m = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
              if (m) {
                const mime = m[1];
                const base64 = m[2];
                const payload = { traceId, mime, base64 };
                const b = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                try { (navigator as any).sendBeacon?.('/api/virtual-tryon/upload', b); diag('ui-cos-upload-start', { via: 'beacon', mime }); } catch { }
                try { await fetch('/api/virtual-tryon/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); diag('ui-cos-upload-success', { mime }); } catch (e: any) { diag('ui-cos-upload-error', e?.message || String(e)); }
              } else {
                diag('ui-cos-upload-skip', 'no-base64-match');
              }
            } catch (e: any) { diag('ui-cos-upload-exception', e?.message || String(e)); }
          } catch (e: any) {
            diag('blob-to-dataurl-error', e?.message || String(e));
            // 保留 ObjectURL，不进行 revoke，确保图片可见
          }
        })();
        // 轻量姿态检测（移动端后台）
        try {
          const isMobileDetect = typeof window !== 'undefined' && window.innerWidth <= 768;
          const runDetect = async () => { const lms = await detectPoseLandmarksNormalized(objUrl); if (lms) poseLmsRef.current = lms; };
          if (isMobileDetect) { const ric = (window as any).requestIdleCallback; if (ric) ric(() => { void runDetect(); }, { timeout: 2000 }); else setTimeout(() => { void runDetect(); }, 400); } else { await runDetect(); }
        } catch {}
      } else if (isJson) {
        try {
          genData = await genResp.json();
        } catch (e: any) {
          diag('server-response-json-error', e?.message || String(e));
          if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
          setProcessingProgress(100);
          setIsResultPending(false);
          setResultImgLoading(false);
          setIsProcessing(false);
          return;
        }
      } else {
        try {
          const txt = await genResp.text();
          const head = txt.slice(0, 200);
          const tail = txt.slice(Math.max(0, txt.length - 200));
          diag('server-non-image-response', { length: txt.length, head, tail });
        } catch (e: any) {
          diag('server-response-text-error', e?.message || String(e));
        }
        if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
        setProcessingProgress(100);
        setIsResultPending(false);
        setResultImgLoading(false);
        setIsProcessing(false);
        return;
      }
      if (genResp.ok && genData?.dataUrl) {
        setResultImgLoading(true);
        setIsResultPending(false);
        emitUI('before-set-url', { urlKind: 'server-dataurl', length: genData.dataUrl.length });
        setResultUrl(genData.dataUrl);
        setShowResult(true);
        baseResultRef.current = genData.dataUrl;
        try {
          const ext = (genData.origMime || '').includes('png') ? 'png' : 'jpg';
          if (lastTraceIdRef.current) {
            if (cosPollTimerRef.current) { try { window.clearInterval(cosPollTimerRef.current); } catch {} cosPollTimerRef.current = null; }
            cosPollAttemptsRef.current = 0;
            setIsCosPolling(true);
            cosPollTimerRef.current = window.setInterval(async () => {
              try {
                cosPollAttemptsRef.current += 1;
                if (cosPollAttemptsRef.current > 15) { if (cosPollTimerRef.current) { try { window.clearInterval(cosPollTimerRef.current); } catch {} cosPollTimerRef.current = null; } setIsCosPolling(false); return; }
                const resp = await fetch(`/api/virtual-tryon/result/${lastTraceIdRef.current}?ext=${ext}`);
                const ct = resp.headers.get('Content-Type') || resp.headers.get('content-type') || '';
                if (resp.ok && ct.toLowerCase().startsWith('image/')) {
                  const blob = await resp.blob();
                  const reader = new FileReader();
                  const dataUrl: string = await new Promise((resolve, reject) => { reader.onloadend = () => resolve(reader.result as string); reader.onerror = (e) => reject(e); reader.readAsDataURL(blob); });
                  setResultImgLoading(true);
                  setResultUrl(dataUrl);
                  setShowResult(true);
                  baseResultRef.current = dataUrl;
                  if (cosPollTimerRef.current) { try { window.clearInterval(cosPollTimerRef.current); } catch {} cosPollTimerRef.current = null; }
                  setIsCosPolling(false);
                }
              } catch {}
            }, 2000);
          }
        } catch {}
        try {
          const mime = genData?.origMime || undefined;
          const base64 = genData?.origBase64 || undefined;
          if (mime && base64) {
            const payload = { traceId, mime, base64 };
            const b = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            try { (navigator as any).sendBeacon?.('/api/virtual-tryon/upload', b); diag('ui-cos-upload-start', { via: 'beacon', mime }); } catch { }
            try { await fetch('/api/virtual-tryon/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); diag('ui-cos-upload-success', { mime }); } catch (e: any) { diag('ui-cos-upload-error', e?.message || String(e)); }
          } else {
            diag('ui-cos-upload-skip', 'no-orig');
          }
        } catch (e: any) { diag('ui-cos-upload-exception', e?.message || String(e)); }
        // 生成响应已拿到首帧，提前结束处理态与进度，避免卡在99%
        if (progressIntervalRef.current) {
          try { window.clearInterval(progressIntervalRef.current); } catch {}
          progressIntervalRef.current = null;
        }
        setProcessingProgress(100);
        setIsProcessing(false);
        // 异步预检测关键点（移动端后台）
        try {
          const isMobileDetect = typeof window !== 'undefined' && window.innerWidth <= 768;
          const runDetect = async () => {
            const lms = await detectPoseLandmarksNormalized(genData.dataUrl);
            if (lms) poseLmsRef.current = lms;
          };
          if (isMobileDetect) {
            const schedule = (fn: () => void) => {
              try { const ric = (window as any).requestIdleCallback; if (ric) ric(fn, { timeout: 2000 }); else setTimeout(fn, 400); }
              catch { setTimeout(fn, 400); }
            };
            schedule(() => { void runDetect(); });
          } else {
            await runDetect();
          }
        } catch {}
        // 暂不进行后台上传：仅显示服务端返回的 DataURL，保证用户体验
      } else {
        // 未获取到 DataURL，结束处理态，避免停留在 Preparing
        if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
        setProcessingProgress(100);
        setIsResultPending(false);
        setResultImgLoading(false);
        setIsProcessing(false);
        diag('ui-no-dataurl');
        // 后续处理（姿态检测/预览/高清）依赖基准图，若无则直接返回，避免误触发预览设置导致再次进入 pending
        return;
      }
      // 基准图：优先使用二进制首帧生成的 DataURL，其次回退 JSON dataUrl
      const baseDataUrl = baseResultRef.current || genData?.dataUrl || '';
      if (!baseDataUrl) {
        diag('server-dataurl-missing');
        return;
      }
      // 预检测一次关键点，避免后续每次滑动重复检测（移动端异步后台进行）
      try {
        const isMobileDetect = typeof window !== 'undefined' && window.innerWidth <= 768;
        const runDetect = async () => {
          const lms = await detectPoseLandmarksNormalized(baseDataUrl);
          if (lms) poseLmsRef.current = lms;
        };
        if (isMobileDetect) {
          const schedule = (fn: () => void) => {
            try {
              const ric = (window as any).requestIdleCallback;
              if (ric) ric(fn, { timeout: 2000 }); else setTimeout(fn, 400);
            } catch { setTimeout(fn, 400); }
          };
          schedule(() => { void runDetect(); });
        } else {
          await runDetect();
        }
      } catch {}
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      let adjustedUrl = baseDataUrl;
      try {
        diag('posewarp-start');
        if (isMobile) {
          // 移动端：优先显示原图，后台低分辨率预览，跳过自动高清
          const schedule = (fn: () => void) => {
            try {
              const ric = (window as any).requestIdleCallback;
              if (ric) ric(fn, { timeout: 2000 }); else setTimeout(fn, 500);
            } catch { setTimeout(fn, 500); }
          };
          schedule(async () => {
            try {
              const preview = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { showKeypoints: false, maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
              // 预览置 loading，等待图片解码完成后自动关闭
              setResultImgLoading(true);
              emitUI('before-set-url', { urlKind: 'preview', length: preview?.length });
              setResultUrl(preview);
              diag('posewarp-success');
            } catch (e) {
              console.warn('[slug tryon] mobile preview warp failed', e);
              diag('posewarp-error', String(e));
            }
          });
        } else {
          // 桌面：先预览后高清
          adjustedUrl = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { showKeypoints: false, maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
          diag('posewarp-success');
        }
      } catch (e) {
        console.warn('[slug tryon] pose warp failed', e);
        diag('posewarp-error', String(e));
      }
      // 不再使用 Blob URL，无需 revoke
      if (!isMobile) {
        setResultImgLoading(true);
        emitUI('before-set-url', { urlKind: 'desktop-preview', length: adjustedUrl?.length });
        setResultUrl(adjustedUrl);
        // 桌面：安排高清渲染覆盖预览图
        (async () => {
          try {
            const hd = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { showKeypoints: false, landmarksNormalized: poseLmsRef.current || undefined });
            setResultImgLoading(true);
            emitUI('before-set-url', { urlKind: 'desktop-hd', length: hd?.length });
            setResultUrl(hd);
          } catch {}
        })();
      }
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

  // 控制结果图加载占位：避免 iOS Safari 在图片未解码时显示问号图标
  const [resultImgLoading, setResultImgLoading] = useState(false);
  useEffect(() => {
    if (resultUrl) {
      // 新的结果地址出现时，先显示加载占位，待 onLoad 后再展示图片
      setResultImgLoading(true);
      setIsResultPending(true);
      emitUI('resultUrl-set', { resultUrl, imgLoading: true, pending: true });
      // 预解码兜底：即使 onLoad 未触发，也尝试主动解码后清除 loading
      (async () => {
        try {
          emitUI('predecode-start');
          if (typeof createImageBitmap === 'function') {
            const res = await fetch(resultUrl);
            const blob = await res.blob();
            await createImageBitmap(blob);
          } else {
            await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(true);
              img.onerror = reject;
              img.src = resultUrl;
            });
          }
          setResultImgLoading(false);
          setIsResultPending(false);
          emitUI('predecode-success');
        } catch (e: any) {
          emitUI('predecode-error', e?.message || String(e));
          // 失败时不改变现有 loading 状态，交由 onError/onLoad 处理
        }
      })();
    } else {
      setResultImgLoading(false);
      // 没有结果地址时，仅在一次生成流程中保持 pending，否则初始进入页面应为非 pending
      // 保持现状：不强制设置 isResultPending=false，这里交由 Try-On 按钮触发时开启
    }
  }, [resultUrl]);

  const applyWarpFromControls = async () => {
    if (!baseResultRef.current) return;
    const mySeq = ++applySeq.current;
    try {
      const controls = warpControlsRef.current;
      const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, controls, { showKeypoints: false, landmarksNormalized: poseLmsRef.current || undefined });
      if (mySeq === applySeq.current) {
        setResultUrl(adjusted);
      }
    } catch (e) {
      console.warn('[slug tryon] apply warp failed', e);
    }
  };

  const applyWarpPreviewFromControls = async () => {
    if (!baseResultRef.current) return;
    const mySeq = ++applySeq.current;
    try {
      const controls = warpControlsRef.current;
      const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, controls, { showKeypoints: false, maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
      if (mySeq === applySeq.current) {
        setResultUrl(adjusted);
      }
    } catch (e) {
      console.warn('[slug tryon] apply preview warp failed', e);
    }
  };

  const applyWarpFinalFromControls = async () => {
    if (!baseResultRef.current) return;
    const mySeq = ++applySeq.current;
    try {
      const controls = warpControlsRef.current;
      const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, controls, { showKeypoints: false, landmarksNormalized: poseLmsRef.current || undefined });
      if (mySeq === applySeq.current) {
        setResultUrl(adjusted);
      }
    } catch (e) {
      console.warn('[slug tryon] apply final warp failed', e);
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
    if (warpPreviewDebounce.current) window.clearTimeout(warpPreviewDebounce.current);
    if (warpFinalDebounce.current) window.clearTimeout(warpFinalDebounce.current);
    // 预览快速响应
    warpPreviewDebounce.current = window.setTimeout(applyWarpPreviewFromControls, 60);
    // 高清结果稍后覆盖
    warpFinalDebounce.current = window.setTimeout(applyWarpFinalFromControls, 300);
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
            {resultUrl ? (
              <div className={styles.result}>
                {(resultImgLoading || isCosPolling) && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>Loading image...</div>
                )}
                <img 
                  src={resultUrl} 
                  alt="Try-on result" 
                  className={styles.resultImage} 
                  onClick={handleImageClick}
                  onLoad={() => { setResultImgLoading(false); setIsResultPending(false); emitUI('img-onload'); }}
                  onError={() => { setResultImgLoading(false); setIsResultPending(false); emitUI('img-onerror'); }}
                  style={{ cursor: 'pointer', transition: 'opacity 200ms ease' }}
                  title="点击放大查看"
                />
              </div>
            ) : (
              isProcessing ? (
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
              ) : (
              isResultPending ? (
                <div className={styles.processing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
                  <div className={styles.spinner}></div>
                  <p>Preparing result image...</p>
                </div>
              ) : (
                <div className={styles.resultPlaceholder}>
                  <p>Your result will appear here after generation.</p>
                  <span className={styles.uploadHint}>Click "Try On Now" to generate</span>
                </div>
              )
              )
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
                    step="2"
                    value={(warpControls as any)[key]}
                    onInput={(e) => handleControlChange(key as keyof typeof warpControls, parseInt((e.currentTarget as HTMLInputElement).value))}
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