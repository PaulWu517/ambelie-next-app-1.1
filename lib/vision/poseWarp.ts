/* Pose-based TPS warp for browser. Minimal dependencies, tasks-vision loaded dynamically. */

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

// 新增：与 Python GUI 一致的七个滑杆（百分比，-20~20）
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
  });
  return _pose;
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

function levelToPercent(level: number): number {
  const map = { 1: -15, 2: -7, 3: 0, 4: 7, 5: 15 } as Record<number, number>;
  return map[Math.max(1, Math.min(5, Math.round(level)))] || 0;
}

// Pose indices (solutions-compatible)
const POSE_IDXS: Record<string, number> = {
  left_shoulder: 11, right_shoulder: 12,
  left_elbow: 13, right_elbow: 14,
  left_wrist: 15, right_wrist: 16,
  left_hip: 23, right_hip: 24,
  left_knee: 25, right_knee: 26,
  left_ankle: 27, right_ankle: 28,
};

function appendMidPoints(src33: Float32Array, w: number, h: number): Float32Array {
  // src33 is flattened [x,y]*33
  const g = (i: number) => [src33[i * 2], src33[i * 2 + 1]] as [number, number];
  const add = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5] as [number, number];
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

// --- TPS core ---
function tpsKernel(r: number): number {
  if (r <= 0) return 0;
  const r2 = r * r;
  return r2 * Math.log(r2 + 1e-8);
}

function solveLinearSystem(A: Float64Array[], b: Float64Array): Float64Array {
  // Gaussian elimination, A is array of rows (length n), b is RHS (length n)
  const n = A.length;
  const M = A.map(row => row.slice());
  const x = new Float64Array(b.length);
  const B = b.slice();
  for (let i = 0; i < n; i++) {
    // pivot
    let maxRow = i, maxVal = Math.abs(M[i][i]);
    for (let r = i + 1; r < n; r++) { const v = Math.abs(M[r][i]); if (v > maxVal) { maxVal = v; maxRow = r; } }
    if (maxVal < 1e-12) continue;
    if (maxRow !== i) { const tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp; const tb = B[i]; B[i] = B[maxRow]; B[maxRow] = tb; }
    // eliminate
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

function tpsSolve(srcPts: Float32Array, dstPts: Float32Array, reg = 1e-3) {
  const N = srcPts.length / 2;
  const rows: Float64Array[] = [];
  const P = new Float64Array(N * 3);
  for (let i = 0; i < N; i++) { P[i * 3] = srcPts[i * 2]; P[i * 3 + 1] = srcPts[i * 2 + 1]; P[i * 3 + 2] = 1; }
  // Build L matrix (N+3 x N+3)
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
      // affine rows
      const ai = r - N; // 0->x,1->y,2->1
      for (let c = 0; c < N; c++) row[c] = P[c * 3 + ai];
      // last 3 are zeros
    }
    rows.push(row);
  }
  const Yx = new Float64Array(size);
  const Yy = new Float64Array(size);
  for (let i = 0; i < N; i++) { Yx[i] = dstPts[i * 2]; Yy[i] = dstPts[i * 2 + 1]; }
  // bottoms stay 0
  const coefX = solveLinearSystem(rows, Yx);
  const coefY = solveLinearSystem(rows, Yy);
  return { coefX, coefY };
}

function tpsMapGrid(gridW: number, gridH: number, srcPts: Float32Array, coef: Float64Array) {
  const N = srcPts.length / 2;
  const w = coef.slice(0, N);
  const a1 = coef[N], a2 = coef[N + 1], a0 = coef[N + 2];
  const map = new Float32Array(gridW * gridH);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      let radial = 0;
      for (let i = 0; i < N; i++) {
        const dx = x - srcPts[i * 2];
        const dy = y - srcPts[i * 2 + 1];
        radial += tpsKernel(Math.hypot(dx, dy)) * w[i];
      }
      map[y * gridW + x] = radial + a1 * x + a2 * y + a0;
    }
  }
  return map;
}

function bilinearSample(src: Uint8ClampedArray, w: number, h: number, x: number, y: number, out: Uint8ClampedArray, idx: number) {
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

function applySymDelta(dst: Float32Array, iA: number, iB: number, valPercent: number, factor: number, srcRef: Float32Array) {
  const xA = srcRef[iA * 2], xB = srcRef[iB * 2];
  const isLeftA = xA <= xB; const iL = isLeftA ? iA : iB; const iR = isLeftA ? iB : iA;
  const d = Math.abs(valPercent) / 100 * factor;
  if (valPercent >= 0) { dst[iL * 2] -= d; dst[iR * 2] += d; } else { dst[iL * 2] += d; dst[iR * 2] -= d; }
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

// 修改：允许第二参数同时支持旧 BodyMeasurements 与新 WarpControls；新增 options.showKeypoints
export async function applyPoseWarpToDataUrl(dataUrl: string, measurements: BodyMeasurements | WarpControls, options?: { showKeypoints?: boolean }): Promise<string> {
  try {
    const img = await imageFromDataUrl(dataUrl);
    const pose = await loadPoseLandmarker();
    const result = pose.detect(img);
    const lms = (result as any)?.landmarks?.[0] as Array<{ x: number, y: number }> | undefined;
    if (!lms || lms.length < 33) return dataUrl;
    const src33 = new Float32Array(33 * 2);
    for (let i = 0; i < 33; i++) { src33[i * 2] = lms[i].x * img.width; src33[i * 2 + 1] = lms[i].y * img.height; }
    // View sizing
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const maxImgW = Math.min(Math.floor(screenW * 0.65), 1000);
    const maxImgH = Math.floor(screenH * 0.85);
    const scale = Math.min(maxImgW / img.width, maxImgH / img.height);
    const viewW = Math.max(1, Math.floor(img.width * scale));
    const viewH = Math.max(1, Math.floor(img.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = viewW; canvas.height = viewH;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0, viewW, viewH);
    const srcFull = appendMidPoints(src33, img.width, img.height);
    const srcPts = new Float32Array(srcFull.length);
    for (let i = 0; i < srcFull.length / 2; i++) { srcPts[i * 2] = srcFull[i * 2] * scale; srcPts[i * 2 + 1] = srcFull[i * 2 + 1] * scale; }
    const dstPts = new Float32Array(srcPts.length); dstPts.set(srcPts);
    // indices
    const idx_ls = POSE_IDXS.left_shoulder, idx_rs = POSE_IDXS.right_shoulder;
    const idx_lh = POSE_IDXS.left_hip, idx_rh = POSE_IDXS.right_hip;
    const idx_wl = 33, idx_wr = 34, idx_tl = 35, idx_tr = 36, idx_upl = 37, idx_upr = 38, idx_fol = 39, idx_for = 40, idx_cal = 41, idx_car = 42;

    // 百分比值（统一为 -20~20），兼容旧 1~5 等级
    let pctShoulder: number, pctWaist: number, pctHips: number, pctThigh: number, pctUpperArm: number, pctForearm: number, pctCalf: number;
    if ((measurements as any).hip !== undefined) {
      const m = measurements as WarpControls;
      pctShoulder = m.shoulder;
      pctWaist = m.waist;
      pctHips = m.hip;
      pctThigh = m.thigh;
      pctUpperArm = m.upper_arm;
      pctForearm = m.forearm;
      pctCalf = m.calf;
    } else {
      const m = measurements as BodyMeasurements;
      pctShoulder = levelToPercent(m.shoulders);
      pctWaist = levelToPercent(m.waist);
      pctHips = levelToPercent(m.hips);
      pctThigh = levelToPercent(m.legs);
      pctUpperArm = levelToPercent(m.arms);
      pctForearm = pctUpperArm; // 旧结构未区分大小臂
      pctCalf = pctThigh;      // 旧结构未区分大小腿
    }

    const vw = viewW;
    applySymDelta(dstPts, idx_lh, idx_rh, pctHips, 0.15 * vw, srcPts);
    applySymDelta(dstPts, idx_wl, idx_wr, pctWaist, 0.20 * vw, srcPts);
    applySymDelta(dstPts, idx_ls, idx_rs, pctShoulder, 0.12 * vw, srcPts);
    applySymDelta(dstPts, idx_tl, idx_tr, pctThigh, 0.15 * vw, srcPts);
    applySymDelta(dstPts, idx_upl, idx_upr, pctUpperArm, 0.12 * vw, srcPts);
    applySymDelta(dstPts, idx_fol, idx_for, pctForearm, 0.10 * vw, srcPts);
    applySymDelta(dstPts, idx_cal, idx_car, pctCalf, 0.12 * vw, srcPts);

    // TPS warp：使用逆映射（dst->src），确保采样正确
    const { coefX: coefInvX, coefY: coefInvY } = tpsSolve(dstPts, srcPts);
    const mapX = tpsMapGrid(viewW, viewH, dstPts, coefInvX);
    const mapY = tpsMapGrid(viewW, viewH, dstPts, coefInvY);
    const srcData = ctx.getImageData(0, 0, viewW, viewH);
    const outData = ctx.createImageData(viewW, viewH);
    for (let y = 0; y < viewH; y++) {
      for (let x = 0; x < viewW; x++) {
        const idx = (y * viewW + x) * 4;
        const sx = mapX[y * viewW + x];
        const sy = mapY[y * viewW + x];
        bilinearSample(srcData.data, viewW, viewH, sx, sy, outData.data, idx);
      }
    }
    ctx.putImageData(outData, 0, 0);

    // 关键点显示（默认开启，便于调试）：绘制原始检测关键点
    const showKP = options?.showKeypoints ?? true;
    if (showKP) {
      drawKeypoints(ctx, srcPts, 'rgba(255,0,0,0.8)');
    }

    return canvas.toDataURL();
  } catch (e) {
    console.warn('[poseWarp] failed, fallback to original', e);
    return dataUrl;
  }
}