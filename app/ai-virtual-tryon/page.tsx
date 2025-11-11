'use client';

import React, { useState, useRef, useEffect } from 'react';

import styles from './VirtualTryOn.module.css';
import { applyPoseWarpToDataUrl, detectPoseLandmarksNormalized } from '@/lib/vision/poseWarp';
import { compressImage } from '@/lib/utils/imageCompression';

interface BodyMeasurements {
  height: number; // 具体数值，如170cm
  bodyType: 'slim' | 'normal' | 'full'; // 身型选择：苗条型、正常型、丰满型
  shoulders: number; // 1-5等级，3为正常
  chest: number; // 1-5等级，3为正常
  waist: number; // 1-5等级，3为正常
  hips: number; // 1-5等级，3为正常
  arms: number; // 1-5等级，3为正常
  legs: number; // 1-5等级，3为正常
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
  const [aiGeneratedResult, setAiGeneratedResult] = useState<{ base64: string; mimeType: string } | null>(null);

  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurements>({
    height: 170, // 默认170cm
    bodyType: 'normal', // 默认正常身型
    shoulders: 3, // 默认正常肩宽
    chest: 3, // 默认正常胸围
    waist: 3, // 默认正常腰围
    hips: 3, // 默认正常臀围
    arms: 3, // 默认正常臂围
    legs: 3 // 默认正常腿长
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);
  const resultInputRef = useRef<HTMLInputElement>(null);

  // 新增：与 Python GUI 一致的七个滑杆控制（百分比，-20~20）
  const [warpControls, setWarpControls] = useState({
    hip: 0,
    waist: 0,
    shoulder: 0,
    thigh: 0,
    upper_arm: 0,
    forearm: 0,
    calf: 0,
  });
  // 记录未变形的基准结果图，以便滑杆实时基于同一基准图进行变形
  const baseResultRef = useRef<string | null>(null);
  const warpDebounce = useRef<number | null>(null);
  const warpPreviewDebounce = useRef<number | null>(null);
  const warpFinalDebounce = useRef<number | null>(null);
  const poseLmsRef = useRef<Float32Array | null>(null);
  // 保持最新的滑杆值以避免定时器闭包读取旧值
  const warpControlsRef = useRef(warpControls);
  useEffect(() => { warpControlsRef.current = warpControls; }, [warpControls]);
  // 异步竞态保护：仅提交最新一次变形结果
  const applySeq = useRef(0);
  // 首帧标记：避免重复首帧绘制
  const firstPaintRef = useRef(false);

  // 过滤 Mediapipe 的 XNNPACK 信息日志，避免 Next 重载红色错误浮层
  useEffect(() => {
    const origError = console.error;
    console.error = (...args: any[]) => {
      const msg = args?.[0];
      if (typeof msg === 'string' && msg.includes('TensorFlow Lite XNNPACK delegate for CPU')) {
        console.info('[mediapipe]', ...args);
        return;
      }
      origError(...args);
    };
    return () => { console.error = origError; };
  }, []);

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

  // Drag-and-drop support for user image upload
  const [isUserDragActive, setIsUserDragActive] = useState(false);
  const handleUserDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(true);
  };
  const handleUserDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(true);
  };
  const handleUserDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(false);
  };
  const handleUserDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUserDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
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
        const url = e.target?.result as string;
        setUploadedResult(url);
        baseResultRef.current = url; // 设置基准图
        // 上传后先快速预览，再高清渲染
        if (warpPreviewDebounce.current) window.clearTimeout(warpPreviewDebounce.current);
        if (warpFinalDebounce.current) window.clearTimeout(warpFinalDebounce.current);
        warpPreviewDebounce.current = window.setTimeout(applyWarpPreviewFromControls, 40);
        warpFinalDebounce.current = window.setTimeout(applyWarpFinalFromControls, 280);
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

  // 根据当前滑杆值进行变形（基于 baseResultRef 的原始图像）
  const applyWarpFromControls = async () => {
    if (!baseResultRef.current) return;
    const mySeq = ++applySeq.current;
    try {
      const controls = warpControlsRef.current;
      const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, controls, { landmarksNormalized: poseLmsRef.current || undefined });
      if (mySeq === applySeq.current) {
        setUploadedResult(adjusted);
      }
    } catch (e) {
      console.warn('[warp] apply failed', e);
    }
  };

  const applyWarpPreviewFromControls = async () => {
    if (!baseResultRef.current) return;
    const mySeq = ++applySeq.current;
    try {
      const controls = warpControlsRef.current;
      const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, controls, { maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
      if (mySeq === applySeq.current) {
        setUploadedResult(adjusted);
      }
    } catch (e) {
      console.warn('[warp] preview apply failed', e);
    }
  };

  const applyWarpFinalFromControls = async () => {
    if (!baseResultRef.current) return;
    const mySeq = ++applySeq.current;
    try {
      const controls = warpControlsRef.current;
      const adjusted = await applyPoseWarpToDataUrl(baseResultRef.current, controls, { landmarksNormalized: poseLmsRef.current || undefined });
      if (mySeq === applySeq.current) {
        setUploadedResult(adjusted);
      }
    } catch (e) {
      console.warn('[warp] final apply failed', e);
    }
  };

  const handleControlChange = (key: keyof typeof warpControls, value: number) => {
    setWarpControls(prev => ({ ...prev, [key]: value }));
    if (warpPreviewDebounce.current) window.clearTimeout(warpPreviewDebounce.current);
    if (warpFinalDebounce.current) window.clearTimeout(warpFinalDebounce.current);
    warpPreviewDebounce.current = window.setTimeout(applyWarpPreviewFromControls, 60);
    warpFinalDebounce.current = window.setTimeout(applyWarpFinalFromControls, 300);
  };

  const handleTryOn = async () => {
    if (!uploadedImage || !uploadedClothing) return;
    setIsProcessing(true);
    const traceId = `page-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const diag = (stage: string, message?: any, extra?: any) => {
      try {
        const payload = { traceId, stage, message, ts: new Date().toISOString(), extra };
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          // fire-and-forget; do not await
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
    try {
      const toBlob = async (dataUrl: string) => {
        const res = await fetch(dataUrl);
        return await res.blob();
      };
  
      console.log('[tryon] start', { hasUser: !!uploadedImage, hasModel: !!uploadedClothing });
  
      const formData = new FormData();
      const userBlob = await toBlob(uploadedImage);
      const modelBlob = await toBlob(uploadedClothing);

      // 将 Blob 转为 File
      let userFile = new File([userBlob], 'user.jpg', { type: userBlob.type || 'image/jpeg' });
      let modelFile = new File([modelBlob], 'model.jpg', { type: modelBlob.type || 'image/jpeg' });

      // 云端限制保护：仅当超限时进行轻量压缩（默认阈值 ≈ 9.5MB）
      const MAX_MB = 9.5;
      if (userFile.size > MAX_MB * 1024 * 1024) {
        try {
          const compressed = await compressImage(userFile, { maxWidth: 2048, maxHeight: 2048, quality: 0.9, outputFormat: 'jpeg' });
          console.log('[tryon] user image compressed due to size', { before: userFile.size, after: compressed.size });
          userFile = compressed;
        } catch (e) {
          console.warn('[tryon] user compress failed, using original', e);
        }
      }
      if (modelFile.size > MAX_MB * 1024 * 1024) {
        try {
          const compressed = await compressImage(modelFile, { maxWidth: 2048, maxHeight: 2048, quality: 0.9, outputFormat: 'jpeg' });
          console.log('[tryon] model image compressed due to size', { before: modelFile.size, after: compressed.size });
          modelFile = compressed;
        } catch (e) {
          console.warn('[tryon] model compress failed, using original', e);
        }
      }

      formData.append('user_image', userFile);
      formData.append('model_image', modelFile);
      formData.append('measurements', JSON.stringify(bodyMeasurements));
      formData.append('prompt', 'Replace the model\'s entire head with the user\'s identity; preserve clothing and pose; seamless blending at hairline and neck.');
      formData.append('traceId', traceId);
  
      diag('api-call');
      const postRespPromise = fetch('/api/virtual-tryon', { method: 'POST', body: formData });
      // 优先：解析 POST 流结果，直接读取 API Blob 显示（避免等待 CDN/HEAD）
      try {
        const postResp = await Promise.race([
          postRespPromise,
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('post-timeout')), 40000))
        ]);
        const txt = await postResp.text();
        const candidate = txt.trim().split('\n').reverse().find(line => line.trim().startsWith('{')) || '';
        let parsed: any = null;
        try { parsed = candidate ? JSON.parse(candidate) : null; } catch {}
        if (parsed?.traceId && parsed?.mime) {
          const ext = String(parsed.mime).includes('jpeg') ? 'jpg' : 'png';
          diag('api-stream-success', { traceId: parsed.traceId, mime: parsed.mime });
          const proxyUrl = `/api/virtual-tryon/result/${parsed.traceId}?ext=${ext}`;
          const imgResp2 = await fetch(proxyUrl, { cache: 'no-store' });
          if (imgResp2.ok) {
            const blob = await imgResp2.blob();
            diag('api-blob-success', { size: blob.size, type: blob.type });
            const objUrl = URL.createObjectURL(blob);
            setUploadedResult(objUrl);
            setShowResult(true);
            firstPaintRef.current = true;
            diag('first-paint', { source: 'api_blob' });
            // 后台转换 DataURL 供姿态变形使用
            const baseDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = (e) => reject(e);
              reader.readAsDataURL(blob);
            });
            diag('dataurl-success', { length: baseDataUrl.length });
            // MIME 由浏览器 Blob 类型决定，此处按 DataURL 推断
            const dataUrlMime = baseDataUrl.substring(baseDataUrl.indexOf(':') + 1, baseDataUrl.indexOf(';')) || 'image/png';
            setAiGeneratedResult({ base64: baseDataUrl.split(',')[1], mimeType: dataUrlMime });
            // 保存基准图（未变形）
            baseResultRef.current = baseDataUrl;
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
            // 移动端后台低清预览；桌面预览后高清
            try {
              diag('posewarp-start');
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
              let adjustedUrl = baseDataUrl;
              if (isMobile) {
                const schedule = (fn: () => void) => {
                  try {
                    const ric = (window as any).requestIdleCallback;
                    if (ric) ric(fn, { timeout: 2000 }); else setTimeout(fn, 500);
                  } catch { setTimeout(fn, 500); }
                };
                schedule(async () => {
                  try {
                    const preview = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { showKeypoints: false, maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
                    setUploadedResult(preview);
                    diag('posewarp-success');
                  } catch (e) {
                    console.warn('[tryon] mobile preview warp failed', e);
                    diag('posewarp-error', String(e));
                  }
                });
              } else {
                // 桌面：先预览后高清
                adjustedUrl = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { showKeypoints: false, maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
                setUploadedResult(adjustedUrl);
                diag('posewarp-success');
                (async () => {
                  try {
                    const hd = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { showKeypoints: false, landmarksNormalized: poseLmsRef.current || undefined });
                    setUploadedResult(hd);
                  } catch {}
                })();
              }
              setShowResult(true);
              diag('render-success');
            } catch {}
            // 已完成首帧显示与后续调度，跳过 HEAD 回退路径
            return;
          } else {
            diag('api-stream-fetch-failed', { status: imgResp2.status });
          }
        } else {
          diag('api-stream-parse-failed');
        }
      } catch (e) {
        diag('api-stream-error', String(e));
      }
      // 不再等待 POST 完整响应，改为两阶段：通过 HEAD 轮询结果是否可读（动态间隔）
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
        const interval = elapsed < 20_000 ? 1200 : 700; // 前段较慢，尾部加速探测
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
      console.log('[tryon] success', { size: blob.size });
      // 先用 Blob URL 即显，提升体感速度
      const objUrl = URL.createObjectURL(blob);
      setUploadedResult(objUrl);
      setShowResult(true);
      // 后台转换 DataURL 供姿态变形使用
      const baseDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(blob);
      });
      diag('dataurl-success', { length: baseDataUrl.length });
      // MIME 由浏览器 Blob 类型决定，此处按 DataURL 推断
      const dataUrlMime = baseDataUrl.substring(baseDataUrl.indexOf(':') + 1, baseDataUrl.indexOf(';')) || 'image/png';
      setAiGeneratedResult({ base64: baseDataUrl.split(',')[1], mimeType: dataUrlMime });
      // 保存基准图（未变形）
      baseResultRef.current = baseDataUrl;
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
              const preview = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
              setUploadedResult(preview);
              diag('posewarp-success');
            } catch (e) {
              console.warn('[tryon] mobile preview warp failed', e);
              diag('posewarp-error', String(e));
            }
          });
        } else {
          // 桌面：先预览，后高清覆盖
          adjustedUrl = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { maxDimension: 640, landmarksNormalized: poseLmsRef.current || undefined });
          diag('posewarp-success');
        }
      } catch (e) {
        console.warn('[tryon] pose warp failed', e);
        diag('posewarp-error', String(e));
      }
      // 替换为变形后的结果，释放临时 Blob URL
      URL.revokeObjectURL(objUrl);
      if (!isMobile) {
        setUploadedResult(adjustedUrl);
        (async () => {
          try {
            const hd = await applyPoseWarpToDataUrl(baseDataUrl, warpControlsRef.current, { landmarksNormalized: poseLmsRef.current || undefined });
            setUploadedResult(hd);
          } catch {}
        })();
      }
      setShowResult(true);
      diag('render-success');
    } catch (err) {
      console.error('[tryon] error', err);
      try { await fetch('/api/diagnostic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ traceId, stage: 'error', message: (err instanceof Error ? err.message : String(err)), ts: new Date().toISOString() }) }); } catch {}
      alert('Failed to generate: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setUploadedImage(null);
    setUploadedClothing(null);
    setUploadedResult(null);
    setAiGeneratedResult(null);
    setShowResult(false);
    setBodyMeasurements({
      height: 170,
      bodyType: 'normal',
      shoulders: 3,
      chest: 3,
      waist: 3,
      hips: 3,
      arms: 3,
      legs: 3
    });
    setWarpControls({ hip: 0, waist: 0, shoulder: 0, thigh: 0, upper_arm: 0, forearm: 0, calf: 0 });
    baseResultRef.current = null;
  };

  // 获取等级描述 - 改为英文
  const getLevelDescription = (level: number): string => {
    const descriptions = ['very small', 'smaller', 'normal', 'larger', 'very large'];
    return descriptions[level - 1] || 'normal';
  };

  // 获取身型描述 - 改为英文
  const getBodyTypeDescription = (type: string): string => {
    const descriptions = {
      'slim': 'Slim',
      'normal': 'Normal', 
      'full': 'Full'
    };
    return descriptions[type as keyof typeof descriptions] || 'Normal';
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
            <div
              className={`${styles.uploadArea} ${isUserDragActive ? styles.uploadAreaDragActive : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleUserDragEnter}
              onDragOver={handleUserDragOver}
              onDragLeave={handleUserDragLeave}
              onDrop={handleUserDrop}
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="Uploaded" className={styles.uploadedImage} />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <div className={styles.uploadIcon}>📷</div>
                  <p>Click or drag to upload your full-body photo</p>
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
                  <div>
                    <img 
                      src={uploadedResult} 
                      alt="Try-on result" 
                      className={styles.resultImage}
                    />
                  </div>
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
              {isProcessing
                ? 'Processing...'
                : ((aiGeneratedResult || baseResultRef.current) ? 'Try On Again' : 'Try On Now')}
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