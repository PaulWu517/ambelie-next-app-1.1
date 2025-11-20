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

  // File -> base64（不带 data: 前缀，仅 data 部分）
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIndex = result.indexOf(',');
        if (commaIndex >= 0) {
          resolve(result.slice(commaIndex + 1));
        } else {
          resolve(result);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
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

      const scfTryonUrl = process.env.NEXT_PUBLIC_SCF_TRYON_URL;

      let genResp: Response;
      let usedDirectVercel = false;

      if (scfTryonUrl) {
        // 生产环境：优先通过腾讯云函数代理（国内用户速度快）
        const userBase64 = await fileToBase64(userFile);
        const payload = {
          traceId,
          mode,
          userMime: userFile.type || 'image/png',
          userBase64,
          modelImageUrl: refUrl,
          prompt: mode === 'outfit' ? (fashionPrompt || '') : (modelPrompt || '')
        };

        try {
          genResp = await fetch(scfTryonUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'image/*'
            },
            body: JSON.stringify(payload)
          });

          // 云函数返回错误（超时 433、SSL 握手 525、网关 502）时，直连 Vercel 兜底
          if (!genResp.ok && (genResp.status === 433 || genResp.status === 525 || genResp.status === 502 || genResp.status === 504)) {
            diag('scf-proxy-failed-fallback-to-vercel', { 
              scfStatus: genResp.status, 
              reason: genResp.status === 433 ? 'timeout' : genResp.status === 525 ? 'ssl-failed' : 'gateway-error'
            });
            
            // 直连 Vercel（跨境但有时比云函数代理更稳定）
            genResp = await fetch('/api/virtual-tryon', {
              method: 'POST',
              body: formData,
              headers: { Accept: 'image/*' }
            });
            usedDirectVercel = true;
            diag('direct-vercel-attempt', { status: genResp.status });
          }
        } catch (scfError: any) {
          // 云函数完全不可达时，直连 Vercel
          diag('scf-unreachable-fallback-to-vercel', { error: scfError?.message || String(scfError) });
          genResp = await fetch('/api/virtual-tryon', {
            method: 'POST',
            body: formData,
            headers: { Accept: 'image/*' }
          });
          usedDirectVercel = true;
          diag('direct-vercel-attempt', { status: genResp.status });
        }
      } else {
        // 本地开发：直接调用 Vercel /api/virtual-tryon
        genResp = await fetch('/api/virtual-tryon', {
          method: 'POST',
          body: formData,
          headers: { Accept: 'image/*' }
        });
      }
      // 记录响应元信息
      const contentType = genResp.headers.get('Content-Type') || genResp.headers.get('content-type');
      diag('server-response-meta', { status: genResp.status, contentType, viaDirectVercel: usedDirectVercel });
      let genData: any = null;
      // 优先处理 JSON 响应（包含预览和原图）
      const isJson = !!contentType && contentType.toLowerCase().includes('application/json');
      const isImage = !!contentType && contentType.toLowerCase().startsWith('image/');
      if (genResp.ok && isJson) {
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

        // ✅ 香港/美国 SCF 直连 Gemini：不上传 COS，直接返回 originalBase64
        if (!genData.previewUrl && !genData.previewFallback && genData.originalBase64) {
          try {
            const mime = genData.mime || 'image/png';
            const originalDataUrl = `data:${mime};base64,${genData.originalBase64}`;
            baseResultRef.current = originalDataUrl;
            setResultImgLoading(true);
            setIsResultPending(true);
            const urlType = 'dataurl';
            emitUI('before-set-url', { urlKind: 'original-direct-from-scf', type: urlType, length: originalDataUrl.length });
            setResultUrl(originalDataUrl);
            setShowResult(true);
            diag('direct-scf-original-shown');
          } catch (e: any) {
            diag('direct-scf-original-error', e?.message || String(e));
          }
          if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
          setProcessingProgress(100);
          setIsProcessing(false);
          return;
        }

        // 🔥 默认方案：从 COS 加载预览图和原图（传输量最小）
        if (genData.previewUrl || genData.previewFallback) {
          diag('dual-url-received', { 
            hasPreviewUrl: !!genData.previewUrl,
            hasOriginalUrl: !!genData.originalUrl,
            hasPreviewFallback: !!genData.previewFallback,
            hasOriginalFallback: !!genData.originalFallback
          });
          
          // 步骤1：立即加载并显示预览图（await 确保完成后再继续）
          const loadAndShowPreview = async () => {
            try {
              let previewDataUrl: string | null = null;
              
              // 优先从 COS URL 加载预览
              if (genData.previewUrl) {
                diag('loading-preview-from-cos', { url: genData.previewUrl });
                try {
                  const resp = await fetch(genData.previewUrl);
                  if (resp.ok) {
                    const blob = await resp.blob();
                    const reader = new FileReader();
                    previewDataUrl = await new Promise((resolve, reject) => {
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                    diag('preview-cos-success', { size: blob.size });
                  }
                } catch (e: any) {
                  diag('preview-cos-error', e?.message || String(e));
                }
              }
              
              // 兜底：使用 Base64
              if (!previewDataUrl && genData.previewFallback) {
                previewDataUrl = genData.previewFallback;
                diag('using-preview-fallback');
              }
              
              // 显示预览图
              if (previewDataUrl) {
                setResultImgLoading(true);
                setIsResultPending(true);
                // 只记录 URL 类型和长度,不打印完整内容
                const urlType = previewDataUrl.startsWith('data:') ? 'dataurl' : 'url';
                emitUI('before-set-url', { urlKind: 'preview-from-cos', type: urlType, length: previewDataUrl.length });
                setResultUrl(previewDataUrl);
                setShowResult(true);
                baseResultRef.current = previewDataUrl;
                diag('preview-shown');
                
                // 立即结束进度条
                if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
                setProcessingProgress(100);
                setIsProcessing(false);
              }
            } catch (e: any) {
              diag('preview-load-error', e?.message || String(e));
            }
          };
          
          // 立即加载预览图
          await loadAndShowPreview();
          
          // 步骤2：立即调用云函数上传原图到 COS（不阻塞 UI）
          if (genData.originalBase64 && genData.originalKey) {
            (async () => {
              try {
                diag('scf-upload-start', { 
                  key: genData.originalKey,
                  size: Math.round(genData.originalBase64.length * 0.75 / 1024) + 'KB'
                });
                
                // 调用腾讯云函数上传原图
                const scfUrl = process.env.NEXT_PUBLIC_SCF_UPLOAD_URL || 'https://1368352639-5umf4ss4xl.ap-guangzhou.tencentscf.com';
                const uploadResp = await fetch(scfUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    traceId: genData.traceId,
                    base64: genData.originalBase64,
                    mime: genData.mime,
                    key: genData.originalKey
                  })
                });
                
                if (uploadResp.ok) {
                  const uploadResult = await uploadResp.json();
                  diag('scf-upload-success', { 
                    url: uploadResult.url,
                    duration: uploadResult.duration,
                    cached: uploadResult.cached
                  });
                } else {
                  diag('scf-upload-failed', { status: uploadResp.status });
                }
              } catch (e: any) {
                diag('scf-upload-error', e?.message || String(e));
              }
            })();
          }
          
          // 步骤3：延迟 2.5 秒后加载原图（让用户明显看到预览效果）
          setTimeout(async () => {
            try {
              let originalDataUrl: string | null = null;
              let loadAttempts = 0;
              const maxAttempts = 8; // 最多尝试 8 次（16 秒），给云函数上传留足时间
              
              // 优先从 COS URL 加载原图（带重试）
              if (genData.originalUrl) {
                diag('loading-original-from-cos', { url: genData.originalUrl });
                
                while (loadAttempts < maxAttempts && !originalDataUrl) {
                  try {
                    const resp = await fetch(genData.originalUrl);
                    if (resp.ok) {
                      const blob = await resp.blob();
                      const reader = new FileReader();
                      originalDataUrl = await new Promise((resolve, reject) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                      });
                      diag('original-cos-success', { size: blob.size, attempts: loadAttempts + 1 });
                      break;
                    } else if (resp.status === 404 && loadAttempts < maxAttempts - 1) {
                      // 404 说明云函数还在上传中，等待 2 秒后重试
                      diag('original-cos-404-retry', { attempt: loadAttempts + 1, note: 'scf-uploading' });
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      loadAttempts++;
                    } else {
                      diag('original-cos-failed', { status: resp.status, attempts: loadAttempts + 1 });
                      break;
                    }
                  } catch (e: any) {
                    diag('original-cos-error', { error: e?.message || String(e), attempts: loadAttempts + 1 });
                    if (loadAttempts < maxAttempts - 1) {
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      loadAttempts++;
                    } else {
                      break;
                    }
                  }
                }
              }
              
              // 兜底：使用 Base64（直接显示，不再上传）
              if (!originalDataUrl && genData.originalBase64) {
                originalDataUrl = `data:${genData.mime};base64,${genData.originalBase64}`;
                diag('using-original-base64-fallback');
              }
              
              // 替换为原图
              if (originalDataUrl) {
                baseResultRef.current = originalDataUrl;
                setResultImgLoading(true);
                // 只记录 URL 类型和长度,不打印完整内容
                const urlType = originalDataUrl.startsWith('data:') ? 'dataurl' : 'url';
                emitUI('before-set-url', { urlKind: 'original-hd-from-cos', type: urlType, length: originalDataUrl?.length || 0 });
                setResultUrl(originalDataUrl);
                diag('original-replaced');
              }
            } catch (e: any) {
              diag('original-load-error', e?.message || String(e));
              // 保留预览图，原图加载失败不影响用户
            }
          }, 2500); // 2.5秒延迟，让用户明显看到预览效果
          
          // 轻量姿态检测（延迟到原图加载后）
          setTimeout(async () => {
            try {
              const isMobileDetect = typeof window !== 'undefined' && window.innerWidth <= 768;
              const runDetect = async () => { const lms = await detectPoseLandmarksNormalized(baseResultRef.current || ''); if (lms) poseLmsRef.current = lms; };
              if (isMobileDetect) { const ric = (window as any).requestIdleCallback; if (ric) ric(() => { void runDetect(); }, { timeout: 2000 }); else setTimeout(() => { void runDetect(); }, 400); } else { await runDetect(); }
            } catch {}
          }, 2000);
          
          // 已完成渐进式加载，跳过后续处理
          return;
        }
      } else if (genResp.ok && isImage) {
        // 备用：处理二进制图片响应（兼容旧版本）
        diag('legacy-image-response', { size: 'unknown' });
        const blob = await genResp.blob();
        const dataUrl = await blobToDataUrl(blob);
        setResultImgLoading(true);
        setIsResultPending(false);
        // 只记录 URL 类型和长度,不打印完整内容
        emitUI('before-set-url', { urlKind: 'legacy-image', type: 'dataurl', length: dataUrl.length });
        setResultUrl(dataUrl);
        setShowResult(true);
        baseResultRef.current = dataUrl;
        if (progressIntervalRef.current) { try { window.clearInterval(progressIntervalRef.current); } catch {} progressIntervalRef.current = null; }
        setProcessingProgress(100);
        setIsProcessing(false);
        genData = { dataUrl }; // 兼容后续逻辑
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
      // 只记录 URL 类型和长度,不打印完整 resultUrl
      const urlType = resultUrl.startsWith('data:') ? 'dataurl' : 'url';
      emitUI('resultUrl-set', { type: urlType, length: resultUrl.length, imgLoading: true, pending: true });
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
