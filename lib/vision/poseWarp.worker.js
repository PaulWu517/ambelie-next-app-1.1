/* eslint-disable no-restricted-globals */
// Pose-based TPS warp worker.
// Handles heavy mathematical computations and pixel manipulation off the main thread.

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
  // src33 is flattened [x,y]*33
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
  
  // Optimization: Grid-based interpolation (Mesh Warping)
  // Compute exact TPS at coarse grid points (e.g. every 8 pixels)
  // and bilinearly interpolate for the rest.
  // Reduces heavy log/sqrt computations by ~64x.
  const STEP = 8;

  // Helper to compute single TPS value at (x, y)
  // Inlined kernel for performance: r^2 * log(r^2)
  const computeVal = (x, y) => {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const dx = x - srcPts[i * 2];
      const dy = y - srcPts[i * 2 + 1];
      const d2 = dx * dx + dy * dy;
      // Avoid log(0). Standard TPS kernel U(r) = r^2 * log(r^2) 
      // (Matches original tpsKernel roughly, scaling factor aside)
      if (d2 > 1e-6) {
        sum += d2 * Math.log(d2) * w[i];
      }
    }
    return sum + a1 * x + a2 * y + a0;
  };

  for (let by = 0; by < gridH; by += STEP) {
    for (let bx = 0; bx < gridW; bx += STEP) {
      // Grid cell corners
      const x0 = bx, x1 = bx + STEP;
      const y0 = by, y1 = by + STEP;

      // Compute values at 4 corners (extrapolate if outside image)
      const v00 = computeVal(x0, y0);
      const v10 = computeVal(x1, y0);
      const v01 = computeVal(x0, y1);
      const v11 = computeVal(x1, y1);

      // Fill inner pixels via bilinear interpolation
      const limitY = Math.min(y1, gridH);
      const limitX = Math.min(x1, gridW);

      for (let y = y0; y < limitY; y++) {
        const dy = (y - y0) / STEP; // 0..1
        // Interpolate vertically on left and right edges
        // val = v0 * (1-dy) + v1 * dy
        const rowL = v00 + (v01 - v00) * dy;
        const rowR = v10 + (v11 - v10) * dy;

        let ptr = y * gridW + bx;
        for (let x = x0; x < limitX; x++) {
          const dx = (x - x0) / STEP; // 0..1
          // Interpolate horizontally
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

// Session state
let sessionData = null;

self.onmessage = function (e) {
  const msg = e.data;
  const { type, id } = msg;

  try {
    if (type === 'init') {
      // msg: { type: 'init', id, imageBuffer, width, height, src33 }
      // Store the buffer and metadata
      const { imageBuffer, width, height, src33 } = msg;
      const srcData = new Uint8ClampedArray(imageBuffer);
      
      // Pre-calculate source points
      const srcFull = appendMidPoints(src33, width, height);
      const srcPts = new Float32Array(srcFull.length);
      for (let i = 0; i < srcFull.length / 2; i++) { srcPts[i * 2] = srcFull[i * 2]; srcPts[i * 2 + 1] = srcFull[i * 2 + 1]; }
      
      sessionData = {
        srcData, // Original pixel data
        width,
        height,
        srcPts,
        src33
      };
      
      self.postMessage({ id, success: true });
      return;
    }

    if (type === 'warp') {
      // msg: { type: 'warp', id, measurements }
      if (!sessionData) throw new Error('Session not initialized');
      
      const { width: viewW, height: viewH, srcData, srcPts } = sessionData;
      const { measurements } = msg;

      const dstPts = new Float32Array(srcPts.length); dstPts.set(srcPts);

      // indices
      const idx_ls = POSE_IDXS.left_shoulder, idx_rs = POSE_IDXS.right_shoulder;
      const idx_lh = POSE_IDXS.left_hip, idx_rh = POSE_IDXS.right_hip;
      const idx_wl = 33, idx_wr = 34, idx_tl = 35, idx_tr = 36, idx_upl = 37, idx_upr = 38, idx_fol = 39, idx_for = 40, idx_cal = 41, idx_car = 42;

      let pctShoulder, pctWaist, pctHips, pctThigh, pctUpperArm, pctForearm, pctCalf;
      if (measurements.hip !== undefined) {
        pctShoulder = measurements.shoulder;
        pctWaist = measurements.waist;
        pctHips = measurements.hip;
        pctThigh = measurements.thigh;
        pctUpperArm = measurements.upper_arm;
        pctForearm = measurements.forearm;
        pctCalf = measurements.calf;
      } else {
        pctShoulder = levelToPercent(measurements.shoulders);
        pctWaist = levelToPercent(measurements.waist);
        pctHips = levelToPercent(measurements.hips);
        pctThigh = levelToPercent(measurements.legs);
        pctUpperArm = levelToPercent(measurements.arms);
        pctForearm = pctUpperArm;
        pctCalf = pctThigh;
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

      self.postMessage({ 
        id, 
        success: true, 
        resultBuffer: outData.buffer
      }, [outData.buffer]);
      return;
    }

    // Legacy one-shot mode (keep for compatibility if needed)
    if (msg.imageBuffer) {
      // ... (Legacy code block if we wanted to keep it, but let's replace it for cleanliness or keep it simple)
      // Re-using logic from above essentially.
      // For this refactor, we'll assume 'init'/'warp' is the way, but let's support the old style just in case
      // by wrapping it:
      
      const { imageBuffer, width, height, src33, measurements } = msg;
      // ... Same logic as "process" but with inline init ...
      // (Omitting full legacy block to save tokens, assuming we update caller)
      // Actually, let's just implement the "one-shot" using the new internal logic briefly
      
      const srcData = new Uint8ClampedArray(imageBuffer);
      const viewW = width;
      const viewH = height;
      const srcFull = appendMidPoints(src33, viewW, viewH);
      const srcPts = new Float32Array(srcFull.length);
      for (let i = 0; i < srcFull.length / 2; i++) { srcPts[i * 2] = srcFull[i * 2]; srcPts[i * 2 + 1] = srcFull[i * 2 + 1]; }
      
      const dstPts = new Float32Array(srcPts.length); dstPts.set(srcPts);
      // ... same measurement logic ...
      // indices
      const idx_ls = POSE_IDXS.left_shoulder, idx_rs = POSE_IDXS.right_shoulder;
      const idx_lh = POSE_IDXS.left_hip, idx_rh = POSE_IDXS.right_hip;
      const idx_wl = 33, idx_wr = 34, idx_tl = 35, idx_tr = 36, idx_upl = 37, idx_upr = 38, idx_fol = 39, idx_for = 40, idx_cal = 41, idx_car = 42;

      let pctShoulder, pctWaist, pctHips, pctThigh, pctUpperArm, pctForearm, pctCalf;
      if (measurements.hip !== undefined) {
        pctShoulder = measurements.shoulder;
        pctWaist = measurements.waist;
        pctHips = measurements.hip;
        pctThigh = measurements.thigh;
        pctUpperArm = measurements.upper_arm;
        pctForearm = measurements.forearm;
        pctCalf = measurements.calf;
      } else {
        pctShoulder = levelToPercent(measurements.shoulders);
        pctWaist = levelToPercent(measurements.waist);
        pctHips = levelToPercent(measurements.hips);
        pctThigh = levelToPercent(measurements.legs);
        pctUpperArm = levelToPercent(measurements.arms);
        pctForearm = pctUpperArm;
        pctCalf = pctThigh;
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

      self.postMessage({ 
        id, 
        success: true, 
        resultBuffer: outData.buffer, 
        srcPts: srcPts 
      }, [outData.buffer]);
    }

  } catch (e) {
    self.postMessage({ id, success: false, error: e.message });
  }
};
