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
      delegate: 'CPU', // 强制使用 CPU 推理，避免移动端 WebGL 上下文丢失或显存不足导致的卡死
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

// Inline Worker Code to avoid file loading issues on mobile / next.js chunks
const WORKER_CODE = `
/* eslint-disable no-restricted-globals */
const POSE_IDXS = {
  left_shoulder: 11, right_shoulder: 12,
  left_elbow: 13, right_elbow: 14,
  left_wrist: 15, right_wrist: 16,
  left_hip: 23, right_hip: 24,
  left_knee: 25, right_knee: 26,
  left_ankle: 27, right_ankle: 28,
};

function levelToPercent(level) {
  const map = { 1: -15, 2: -7, 3: 0, 4: 7, 5: 15 };
  return map[Math.max(1, Math.min(5, Math.round(level)))] || 0;
}

function appendMidPoints(src33, w, h) {
  const g = (i) => [src33[i * 2], src33[i * 2 + 1]];
  const add = (a, b) => [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5];
  const ls = g(POSE_IDXS.left_shoulder), rs = g(POSE_IDXS.right_shoulder);
  const le = g(POSE_IDXS.left_elbow), re = g(POSE_IDXS.right_elbow);
  const lw = g(POSE_IDXS.left_wrist), rw = g(POSE_IDXS.right_wrist);
  const lh = g(POSE_IDXS.left_hip), rh = g(POSE_IDXS.right_hip);
  const lk = g(POSE_IDXS.left_knee), rk = g(POSE_IDXS.right_knee);
  const la = g(POSE_IDXS.left_ankle), ra = g(POSE_IDXS.right_ankle);
  const waist_left = add(ls, lh), waist_right = add(rs, rh);
  const thigh_left = add(lh, lk), thigh_right = add(rh, rk);
  const upper_arm_left = add(ls, le), upper_arm_right = add(rs, re);
  const forearm_left = add(le, lw), forearm_right = add(re, rw);
  const calf_left = add(lk, la), calf_right = add(rk, ra);
  const extra = [waist_left, waist_right, thigh_left, thigh_right, upper_arm_left, upper_arm_right, forearm_left, forearm_right, calf_left, calf_right];
  const out = new Float32Array((33 + 10) * 2);
  out.set(src33);
  extra.forEach((p, i) => { out[(33 + i) * 2] = p[0]; out[(33 + i) * 2 + 1] = p[1]; });
  return out;
}

function tpsKernel(r) {
  if (r <= 0) return 0;
  const r2 = r * r;
  return r2 * Math.log(r2 + 1e-8);
}

function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map(row => row.slice());
  const x = new Float64Array(b.length);
  const B = b.slice();
  for (let i = 0; i < n; i++) {
    let maxRow = i, maxVal = Math.abs(M[i][i]);
    for (let r = i + 1; r < n; r++) { const v = Math.abs(M[r][i]); if (v > maxVal) { maxVal = v; maxRow = r; } }
    if (maxVal < 1e-12) continue;
    if (maxRow !== i) { const tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp; const tb = B[i]; B[i] = B[maxRow]; B[maxRow] = tb; }
    const piv = M[i][i];
    for (let j = i; j < n; j++) M[i][j] /= piv; B[i] /= piv;
    for (let r = 0; r < n; r++) if (r !== i) {
      const f = M[r][i]; if (Math.abs(f) < 1e-12) continue;
      for (let j = i; j < n; j++) M[r][j] -= f * M[i][j];
      B[r] -= f * B[i];
    }
  }
  for (let i = 0; i < n; i++) x[i] = B[i];
  return x;
}

function tpsSolve(srcPts, dstPts, reg = 1e-3) {
  const N = srcPts.length / 2;
  const rows = [];
  const P = new Float64Array(N * 3);
  for (let i = 0; i < N; i++) { P[i * 3] = srcPts[i * 2]; P[i * 3 + 1] = srcPts[i * 2 + 1]; P[i * 3 + 2] = 1; }
  const size = N + 3;
  for (let r = 0; r < size; r++) {
    const row = new Float64Array(size);
    if (r < N) {
      for (let c = 0; c < N; c++) {
        const dx = srcPts[r * 2] - srcPts[c * 2];
        const dy = srcPts[r * 2 + 1] - srcPts[c * 2 + 1];
        const d = Math.hypot(dx, dy);
        row[c] = tpsKernel(d) + (r === c ? reg : 0);
      }
      row[N] = P[r * 3]; row[N + 1] = P[r * 3 + 1]; row[N + 2] = P[r * 3 + 2];
    } else {
      const ai = r - N;
      for (let c = 0; c < N; c++) row[c] = P[c * 3 + ai];
    }
    rows.push(row);
  }
  const Yx = new Float64Array(size);
  const Yy = new Float64Array(size);
  for (let i = 0; i < N; i++) { Yx[i] = dstPts[i * 2]; Yy[i] = dstPts[i * 2 + 1]; }
  const coefX = solveLinearSystem(rows, Yx);
  const coefY = solveLinearSystem(rows, Yy);
  return { coefX, coefY };
}

function tpsMapGrid(gridW, gridH, srcPts, coef) {
  const N = srcPts.length / 2;
  const w = coef.slice(0, N);
  const a1 = coef[N], a2 = coef[N + 1], a0 = coef[N + 2];
  const map = new Float32Array(gridW * gridH);
  const STEP = 8;
  const computeVal = (x, y) => {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const dx = x - srcPts[i * 2];
      const dy = y - srcPts[i * 2 + 1];
      const d2 = dx * dx + dy * dy;
      if (d2 > 1e-6) {
        sum += d2 * Math.log(d2) * w[i];
      }
    }
    return sum + a1 * x + a2 * y + a0;
  };
  for (let by = 0; by < gridH; by += STEP) {
    for (let bx = 0; bx < gridW; bx += STEP) {
      const x0 = bx, x1 = bx + STEP;
      const y0 = by, y1 = by + STEP;
      const v00 = computeVal(x0, y0);
      const v10 = computeVal(x1, y0);
      const v01 = computeVal(x0, y1);
      const v11 = computeVal(x1, y1);
      const limitY = Math.min(y1, gridH);
      const limitX = Math.min(x1, gridW);
      for (let y = y0; y < limitY; y++) {
        const dy = (y - y0) / STEP;
        const rowL = v00 + (v01 - v00) * dy;
        const rowR = v10 + (v11 - v10) * dy;
        let ptr = y * gridW + bx;
        for (let x = x0; x < limitX; x++) {
          const dx = (x - x0) / STEP;
          map[ptr++] = rowL + (rowR - rowL) * dx;
        }
      }
    }
  }
  return map;
}

function bilinearSample(src, w, h, x, y, out, idx) {
  x = Math.max(0, Math.min(w - 1.001, x));
  y = Math.max(0, Math.min(h - 1.001, y));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = x0 + 1, y1 = y0 + 1;
  const fx = x - x0, fy = y - y0;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
  for (let c = 0; c < 4; c++) {
    out[idx + c] = Math.round(
      src[i00 + c] * w00 + src[i10 + c] * w10 + src[i01 + c] * w01 + src[i11 + c] * w11
    );
  }
}

function applySymDelta(dst, iA, iB, valPercent, factor, srcRef) {
  const xA = srcRef[iA * 2], xB = srcRef[iB * 2];
  const isLeftA = xA <= xB; const iL = isLeftA ? iA : iB; const iR = isLeftA ? iB : iA;
  const d = Math.abs(valPercent) / 100 * factor;
  if (valPercent >= 0) { dst[iL * 2] -= d; dst[iR * 2] += d; } else { dst[iL * 2] += d; dst[iR * 2] -= d; }
}

let sessionData = null;

self.onmessage = function (e) {
  const msg = e.data;
  const { type, id } = msg;

  try {
    if (type === 'init') {
      const { imageBuffer, width, height, src33 } = msg;
      const srcData = new Uint8ClampedArray(imageBuffer);
      const srcFull = appendMidPoints(src33, width, height);
      const srcPts = new Float32Array(srcFull.length);
      for (let i = 0; i < srcFull.length / 2; i++) { srcPts[i * 2] = srcFull[i * 2]; srcPts[i * 2 + 1] = srcFull[i * 2 + 1]; }
      sessionData = { srcData, width, height, srcPts, src33 };
      self.postMessage({ id, success: true });
      return;
    }

    if (type === 'warp') {
      if (!sessionData) throw new Error('Session not initialized');
      const { width: viewW, height: viewH, srcData, srcPts } = sessionData;
      const { measurements } = msg;
      const dstPts = new Float32Array(srcPts.length); dstPts.set(srcPts);
      const idx_ls = POSE_IDXS.left_shoulder, idx_rs = POSE_IDXS.right_shoulder;
      const idx_lh = POSE_IDXS.left_hip, idx_rh = POSE_IDXS.right_hip;
      const idx_wl = 33, idx_wr = 34, idx_tl = 35, idx_tr = 36, idx_upl = 37, idx_upr = 38, idx_fol = 39, idx_for = 40, idx_cal = 41, idx_car = 42;
      let pctShoulder, pctWaist, pctHips, pctThigh, pctUpperArm, pctForearm, pctCalf;
      if (measurements.hip !== undefined) {
        pctShoulder = measurements.shoulder; pctWaist = measurements.waist; pctHips = measurements.hip; pctThigh = measurements.thigh; pctUpperArm = measurements.upper_arm; pctForearm = measurements.forearm; pctCalf = measurements.calf;
      } else {
        pctShoulder = levelToPercent(measurements.shoulders); pctWaist = levelToPercent(measurements.waist); pctHips = levelToPercent(measurements.hips); pctThigh = levelToPercent(measurements.legs); pctUpperArm = levelToPercent(measurements.arms); pctForearm = pctUpperArm; pctCalf = pctThigh;
      }
      const vw = viewW;
      applySymDelta(dstPts, idx_lh, idx_rh, pctHips, 0.15 * vw, srcPts);
      applySymDelta(dstPts, idx_wl, idx_wr, pctWaist, 0.20 * vw, srcPts);
      applySymDelta(dstPts, idx_ls, idx_rs, pctShoulder, 0.12 * vw, srcPts);
      applySymDelta(dstPts, idx_tl, idx_tr, pctThigh, 0.15 * vw, srcPts);
      applySymDelta(dstPts, idx_upl, idx_upr, pctUpperArm, 0.12 * vw, srcPts);
      applySymDelta(dstPts, idx_fol, idx_for, pctForearm, 0.10 * vw, srcPts);
      applySymDelta(dstPts, idx_cal, idx_car, pctCalf, 0.12 * vw, srcPts);
      const { coefX: coefInvX, coefY: coefInvY } = tpsSolve(dstPts, srcPts);
      const mapX = tpsMapGrid(viewW, viewH, dstPts, coefInvX);
      const mapY = tpsMapGrid(viewW, viewH, dstPts, coefInvY);
      const outData = new Uint8ClampedArray(viewW * viewH * 4);
      for (let y = 0; y < viewH; y++) {
        for (let x = 0; x < viewW; x++) {
          const idx = (y * viewW + x) * 4;
          const sx = mapX[y * viewW + x];
          const sy = mapY[y * viewW + x];
          bilinearSample(srcData, viewW, viewH, sx, sy, outData, idx);
        }
      }
      self.postMessage({ id, success: true, resultBuffer: outData.buffer }, [outData.buffer]);
      return;
    }
    
    // Legacy support for one-shot
    if (msg.imageBuffer) {
      const { imageBuffer, width, height, src33, measurements } = msg;
      const srcData = new Uint8ClampedArray(imageBuffer);
      const srcFull = appendMidPoints(src33, width, height);
      const srcPts = new Float32Array(srcFull.length);
      for (let i = 0; i < srcFull.length / 2; i++) { srcPts[i * 2] = srcFull[i * 2]; srcPts[i * 2 + 1] = srcFull[i * 2 + 1]; }
      const dstPts = new Float32Array(srcPts.length); dstPts.set(srcPts);
      const idx_ls = POSE_IDXS.left_shoulder, idx_rs = POSE_IDXS.right_shoulder;
      const idx_lh = POSE_IDXS.left_hip, idx_rh = POSE_IDXS.right_hip;
      const idx_wl = 33, idx_wr = 34, idx_tl = 35, idx_tr = 36, idx_upl = 37, idx_upr = 38, idx_fol = 39, idx_for = 40, idx_cal = 41, idx_car = 42;
      let pctShoulder, pctWaist, pctHips, pctThigh, pctUpperArm, pctForearm, pctCalf;
      if (measurements.hip !== undefined) {
        pctShoulder = measurements.shoulder; pctWaist = measurements.waist; pctHips = measurements.hip; pctThigh = measurements.thigh; pctUpperArm = measurements.upper_arm; pctForearm = measurements.forearm; pctCalf = measurements.calf;
      } else {
        pctShoulder = levelToPercent(measurements.shoulders); pctWaist = levelToPercent(measurements.waist); pctHips = levelToPercent(measurements.hips); pctThigh = levelToPercent(measurements.legs); pctUpperArm = levelToPercent(measurements.arms); pctForearm = pctUpperArm; pctCalf = pctThigh;
      }
      const vw = width;
      applySymDelta(dstPts, idx_lh, idx_rh, pctHips, 0.15 * vw, srcPts);
      applySymDelta(dstPts, idx_wl, idx_wr, pctWaist, 0.20 * vw, srcPts);
      applySymDelta(dstPts, idx_ls, idx_rs, pctShoulder, 0.12 * vw, srcPts);
      applySymDelta(dstPts, idx_tl, idx_tr, pctThigh, 0.15 * vw, srcPts);
      applySymDelta(dstPts, idx_upl, idx_upr, pctUpperArm, 0.12 * vw, srcPts);
      applySymDelta(dstPts, idx_fol, idx_for, pctForearm, 0.10 * vw, srcPts);
      applySymDelta(dstPts, idx_cal, idx_car, pctCalf, 0.12 * vw, srcPts);
      const { coefX: coefInvX, coefY: coefInvY } = tpsSolve(dstPts, srcPts);
      const mapX = tpsMapGrid(width, height, dstPts, coefInvX);
      const mapY = tpsMapGrid(width, height, dstPts, coefInvY);
      const outData = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const sx = mapX[y * width + x];
          const sy = mapY[y * width + x];
          bilinearSample(srcData, width, height, sx, sy, outData, idx);
        }
      }
      self.postMessage({ id, success: true, resultBuffer: outData.buffer, srcPts }, [outData.buffer]);
    }
  } catch (e) {
    self.postMessage({ id, success: false, error: e.message });
  }
};
`;

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

// 新增：允许外部注入日志函数，用于远程诊断移动端问题
let _logger: (msg: string, data?: any) => void = (msg, data) => console.log(`[poseWarp] ${msg}`, data);
export function setWarpLogger(fn: (msg: string, data?: any) => void) {
  _logger = fn;
}

function getWorker() {
  if (typeof window === 'undefined') return null; // Server-side safe
  if (!_worker) {
    try {
      _logger('Creating Blob Worker...');
      // Create Worker from Blob to avoid file loading issues on mobile/different environments
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      _logger('Blob URL created', { url });
      _worker = new Worker(url);
      
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
            const errMsg = error || 'Worker failed';
            _logger('Worker response error', { id, errMsg });
            p.reject(new Error(errMsg));
          }
        }
      };
      
      _worker.onerror = (e) => {
        _logger('Worker error event', { message: e.message, filename: e.filename, lineno: e.lineno });
        console.error('[poseWarp] Worker error', e);
        // If worker fails hard, we might want to kill it
      };
    } catch (e) {
      _logger('Failed to create Blob Worker', e);
      console.error('[poseWarp] Failed to create Blob Worker', e);
      return null;
    }
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
  _logger('initWarpSession start', { maxDimension: options?.maxDimension });
  const worker = getWorker();
  if (!worker) {
     _logger('initWarpSession failed: No worker');
     throw new Error('Worker not available');
  }

  const img = await imageFromDataUrl(dataUrl);
  const origW = img.width;
  const origH = img.height;
  _logger('Image loaded for session', { w: origW, h: origH });
  
  // Detect landmarks if not provided
  let lmsNorm = options?.landmarksNormalized;
  if (!lmsNorm) {
    _logger('Detecting landmarks (CPU enforced)...');
    try {
        // Race detection with timeout
        const detectPromise = (async () => {
            const pose = await loadPoseLandmarker();
            return pose.detect(img);
        })();
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Landmark detection timeout (5s)')), 5000)
        );

        const result: any = await Promise.race([detectPromise, timeoutPromise]);
        
        const lms = result?.landmarks?.[0] as Array<{ x: number, y: number }> | undefined;
        if (!lms || lms.length < 33) {
            _logger('No landmarks detected');
            throw new Error('No landmarks detected');
        }
        lmsNorm = new Float32Array(33 * 2);
        for (let i = 0; i < 33; i++) { lmsNorm[i * 2] = lms[i].x; lmsNorm[i * 2 + 1] = lms[i].y; }
        _logger('Landmarks detected');
    } catch (e) {
        _logger('Landmark detection failed or timed out', e);
        throw e;
    }
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

  _logger('Sending init msg to worker', { id, viewW, viewH });
  worker.postMessage({
    type: 'init',
    id,
    imageBuffer: srcImageData.data.buffer,
    width: viewW,
    height: viewH,
    src33
  }, [srcImageData.data.buffer]);

  try {
      await p;
      _logger('Worker init success');
  } catch (err) {
      _logger('Worker init failed', err);
      throw err;
  }

  // Return interface
  return {
    warp: async (controls: WarpControls) => {
      // _logger('warp() called', { controls }); 
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

      try {
          const { resultBuffer } = await warpP;
          const outImageData = new ImageData(new Uint8ClampedArray(resultBuffer), viewW, viewH);
          ctx.putImageData(outImageData, 0, 0);
      } catch (e) {
          _logger('warp execution failed', { warpId, error: e });
          throw e;
      }
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
