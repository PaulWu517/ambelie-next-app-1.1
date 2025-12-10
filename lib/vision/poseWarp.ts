/* Pose-based TPS warp for browser. Uses Web Worker for heavy lifting. */

export type BodyMeasurements = {
  height: number;
  bodyType: 'slim' | 'normal' | 'full';
  shoulders: number; // 1-5
  chest: number; // currently unused
  waist: number; // 1-5
  hips: number; // 1-5
  arms: number; // 1-5
  legs: number; // 1-5
};

export type WarpControls = {
  hip: number; // 臀部宽度（%）
  waist: number; // 腰部宽度（%）
  shoulder: number; // 肩部宽度（%）
  thigh: number; // 大腿宽度（%）
  upper_arm: number; // 大臂宽度（%）
  forearm: number; // 小臂宽度（%）
  calf: number; // 小腿宽度（%）
};

// --- MediaPipe Pose Landmarker (Tasks) ---
let _pose: any | null = null;
async function loadPoseLandmarker() {
  if (_pose) return _pose;
  const vision = await (await import('@mediapipe/tasks-vision')).FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );
  const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
  _pose = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
    },
    runningMode: 'IMAGE',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
  });
  return _pose;
}

// 检测关键点（归一化坐标，0..1），以便重复使用避免多次检测带来的开销
export async function detectPoseLandmarksNormalized(dataUrl: string): Promise<Float32Array | null> {
  try {
    const img = await imageFromDataUrl(dataUrl);
    const pose = await loadPoseLandmarker();
    const result = pose.detect(img);
    const lms = (result as any)?.landmarks?.[0] as Array<{ x: number, y: number }> | undefined;
    if (!lms || lms.length < 33) return null;
    const out = new Float32Array(33 * 2);
    for (let i = 0; i < 33; i++) { out[i * 2] = lms[i].x; out[i * 2 + 1] = lms[i].y; }
    return out;
  } catch (e) {
    console.warn('[poseWarp] detect failed', e);
    return null;
  }
}

async function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// --- Worker Management ---

interface WarpWorkerResponse {
  id: number;
  success: boolean;
  resultBuffer?: ArrayBuffer;
  srcPts?: Float32Array; // Returned from worker for drawing
  error?: string;
}

let _worker: Worker | null = null;
let _reqId = 0;
const _pending = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

function getWorker() {
  if (typeof window === 'undefined') return null; // Server-side safe
  if (!_worker) {
    _worker = new Worker(new URL('./poseWarp.worker.js', import.meta.url));
    _worker.onmessage = (e) => {
      const { id, success, resultBuffer, srcPts, error } = e.data as WarpWorkerResponse;
      const p = _pending.get(id);
      if (p) {
        _pending.delete(id);
        if (success && resultBuffer) {
          p.resolve({ resultBuffer, srcPts });
        } else if (success) {
          // Simple success without buffer (e.g. init)
          p.resolve(true);
    } else {
          p.reject(new Error(error || 'Worker failed'));
      }
    }
    };
    _worker.onerror = (e) => {
      console.error('[poseWarp] Worker error', e);
    };
  }
  return _worker;
}

function drawKeypoints(ctx: CanvasRenderingContext2D, pts: Float32Array, color = 'rgba(255,0,0,0.85)') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  for (let i = 0; i < pts.length / 2; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Helper to perform persistent session warp
// Returns a method to process warp and a cleanup method
export async function initWarpSession(
  dataUrl: string, 
  canvas: HTMLCanvasElement, 
  options?: { maxDimension?: number, landmarksNormalized?: Float32Array }
) {
  const worker = getWorker();
  if (!worker) throw new Error('Worker not available');

  const img = await imageFromDataUrl(dataUrl);
  const origW = img.width;
  const origH = img.height;
  
  // Detect landmarks if not provided
  let lmsNorm = options?.landmarksNormalized;
  if (!lmsNorm) {
    const pose = await loadPoseLandmarker();
    const result = pose.detect(img);
    const lms = (result as any)?.landmarks?.[0] as Array<{ x: number, y: number }> | undefined;
    if (!lms || lms.length < 33) throw new Error('No landmarks detected');
    lmsNorm = new Float32Array(33 * 2);
    for (let i = 0; i < 33; i++) { lmsNorm[i * 2] = lms[i].x; lmsNorm[i * 2 + 1] = lms[i].y; }
  }

  // Determine view size
  let viewW = origW;
  let viewH = origH;
  const maxDim = options?.maxDimension;
  if (typeof maxDim === 'number' && maxDim > 0) {
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    viewW = Math.max(1, Math.round(origW * scale));
    viewH = Math.max(1, Math.round(origH * scale));
  }

  // Prepare src33 for this size
  const src33 = new Float32Array(33 * 2);
  for (let i = 0; i < 33; i++) {
    src33[i * 2] = lmsNorm[i * 2] * viewW;
    src33[i * 2 + 1] = lmsNorm[i * 2 + 1] * viewH;
  }

  // Set canvas size
  canvas.width = viewW;
  canvas.height = viewH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, viewW, viewH);
  const srcImageData = ctx.getImageData(0, 0, viewW, viewH);

  // Init session in worker
  const id = ++_reqId;
  const p = new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject });
    setTimeout(() => { if (_pending.has(id)) { _pending.delete(id); reject(new Error('Init timeout')); } }, 10000);
  });

  worker.postMessage({
    type: 'init',
    id,
    imageBuffer: srcImageData.data.buffer,
    width: viewW,
    height: viewH,
    src33
  }, [srcImageData.data.buffer]);

  await p;

  // Return interface
  return {
    warp: async (controls: WarpControls) => {
      const warpId = ++_reqId;
      const warpP = new Promise<{ resultBuffer: ArrayBuffer }>((resolve, reject) => {
        _pending.set(warpId, { resolve, reject });
        // Fast timeout for warp
        setTimeout(() => { if (_pending.has(warpId)) { _pending.delete(warpId); reject(new Error('Warp timeout')); } }, 2000);
      });

      worker.postMessage({
        type: 'warp',
        id: warpId,
        measurements: controls
      });

      const { resultBuffer } = await warpP;
      const outImageData = new ImageData(new Uint8ClampedArray(resultBuffer), viewW, viewH);
      ctx.putImageData(outImageData, 0, 0);
    },
    cleanup: () => {
      // If we need to tell worker to free memory, we can add a 'destroy' message
      // For now, worker just overwrites on next init
    }
  };
}

// Legacy one-shot compatibility wrapper
export async function applyPoseWarpToDataUrl(
  dataUrl: string,
  measurements: BodyMeasurements | WarpControls,
  options?: { showKeypoints?: boolean, maxDimension?: number, landmarksNormalized?: Float32Array }
): Promise<string> {
  try {
    // Just reuse the legacy one-shot logic in worker or init new logic?
    // Let's stick to original flow to minimize breakage, but use the same worker instance
    const img = await imageFromDataUrl(dataUrl);
    const origW = img.width;
    const origH = img.height;
    let lmsNorm = options?.landmarksNormalized;
    if (!lmsNorm) {
      const pose = await loadPoseLandmarker();
      const result = pose.detect(img);
      const lms = (result as any)?.landmarks?.[0] as Array<{ x: number, y: number }> | undefined;
      if (!lms || lms.length < 33) return dataUrl;
      lmsNorm = new Float32Array(33 * 2);
      for (let i = 0; i < 33; i++) { lmsNorm[i * 2] = lms[i].x; lmsNorm[i * 2 + 1] = lms[i].y; }
    }
    const src33 = new Float32Array(33 * 2);
    let viewW = origW;
    let viewH = origH;
    const maxDim = options?.maxDimension;
    if (typeof maxDim === 'number' && maxDim > 0) {
      const scale = Math.min(1, maxDim / Math.max(origW, origH));
      viewW = Math.max(1, Math.round(origW * scale));
      viewH = Math.max(1, Math.round(origH * scale));
      for (let i = 0; i < 33; i++) { src33[i * 2] = lmsNorm[i * 2] * origW * scale; src33[i * 2 + 1] = lmsNorm[i * 2 + 1] * origH * scale; }
    } else {
      for (let i = 0; i < 33; i++) { src33[i * 2] = lmsNorm[i * 2] * origW; src33[i * 2 + 1] = lmsNorm[i * 2 + 1] * origH; }
    }
    
    const canvas = document.createElement('canvas'); canvas.width = viewW; canvas.height = viewH;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0, viewW, viewH);
    
    const srcImageData = ctx.getImageData(0, 0, viewW, viewH);
    const worker = getWorker();
    if (!worker) return dataUrl;

    const id = ++_reqId;
    const p = new Promise<{ resultBuffer: ArrayBuffer, srcPts?: Float32Array }>((resolve, reject) => {
      _pending.set(id, { resolve, reject });
      setTimeout(() => { if (_pending.has(id)) { _pending.delete(id); reject(new Error('Worker timeout')); } }, 10000);
    });

    // Send legacy style message (no type = legacy flow in our updated worker, or we updated worker to handle it)
    // Worker updated to handle msg.imageBuffer as legacy.
    worker.postMessage({
      id,
      imageBuffer: srcImageData.data.buffer,
      width: viewW,
      height: viewH,
      src33,
      measurements
    }, [srcImageData.data.buffer]);

    const { resultBuffer, srcPts } = await p;
    const outImageData = new ImageData(new Uint8ClampedArray(resultBuffer), viewW, viewH);
    ctx.putImageData(outImageData, 0, 0);

    const showKP = options?.showKeypoints ?? true;
    if (showKP && srcPts) {
      drawKeypoints(ctx, srcPts, 'rgba(255,0,0,0.8)');
    }

    return canvas.toDataURL();
  } catch (e) {
    console.warn('[poseWarp] failed, fallback to original', e);
    return dataUrl;
  }
}
