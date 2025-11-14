import { NextResponse } from 'next/server';
import { getBufferFromCOS, objectExistsInCOS } from '@/lib/utils/cos';

async function emitServer(traceId: string, stage: string, message?: any) {
  try {
    const payload = { traceId, stage, message, ts: new Date().toISOString() };
    const target = process.env.DIAG_LOG_PATH;
    if (target) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(target, `${payload.ts} [trace:${traceId}] [stage:${stage}] ${JSON.stringify(message || '')}\n`, { encoding: 'utf-8' });
      } catch (e) {
        console.log('[diagnostic-fallback]', payload);
      }
    } else {
      console.log('[diagnostic]', payload);
    }
  } catch {}
}

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: Promise<{ traceId: string }> }) {
  const { traceId } = await ctx.params;
  const url = new URL(req.url);
  const ext = (url.searchParams.get('ext') || 'png').toLowerCase();
  const basePath = process.env.TRYON_COS_BASE_PATH || 'tryon-results/';
  const key = `${basePath}${traceId}.${ext}`;
  try {
    await emitServer(traceId, 'result-get-start', { key });
    let { buf, mime } = await getBufferFromCOS(key);
    // The Node.js Buffer from COS SDK might be backed by a SharedArrayBuffer,
    // which is not compatible with Blob or NextResponse constructors.
    // We must explicitly copy it into a new, non-shared ArrayBuffer.
    const arrayBuffer = new ArrayBuffer(buf.length);
    const view = new Uint8Array(arrayBuffer);
    view.set(buf);
    return new NextResponse(arrayBuffer, { headers: { 'Content-Type': mime || (ext === 'png' ? 'image/png' : 'image/jpeg'), 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    // 回退尝试另一种扩展名，避免客户端不确定最终格式时读取失败
    const altExt = ext === 'png' ? 'jpg' : 'png';
    const altKey = `${basePath}${traceId}.${altExt}`;
    try {
      await emitServer(traceId, 'result-get-fallback', { altKey });
      const { buf, mime } = await getBufferFromCOS(altKey);
      const arrayBuffer = new ArrayBuffer(buf.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(buf);
      return new NextResponse(arrayBuffer, { headers: { 'Content-Type': mime || (altExt === 'png' ? 'image/png' : 'image/jpeg'), 'Cache-Control': 'no-store', 'X-Used-Ext': altExt } });
    } catch (e2: any) {
      const msg = e2?.message || String(e2);
      console.error('[virtual-tryon-result] fetch from COS failed', { key, altKey, msg });
      await emitServer(traceId, 'result-get-error', { key, altKey, error: msg });
      return NextResponse.json({ error: 'Not found', message: msg, key }, { status: 404 });
    }
  }
}

export async function HEAD(req: Request, ctx: { params: Promise<{ traceId: string }> }) {
  const { traceId } = await ctx.params;
  const url = new URL(req.url);
  // 允许客户端不指定扩展名，通过 HEAD 探测两种可能
  const basePath = process.env.TRYON_COS_BASE_PATH || 'tryon-results/';
  const keys = [`${basePath}${traceId}.png`, `${basePath}${traceId}.jpg`];
  await emitServer(traceId, 'head-check-start', { keys });
  // 并发检查两种扩展，优先返回先就绪的结果
  const checks = keys.map(async (k) => {
    try {
      const meta = await objectExistsInCOS(k);
      if (meta.exists) {
        await emitServer(traceId, 'head-200', { key: k, contentType: meta.contentType, contentLength: meta.contentLength });
        const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Found-Ext': k.endsWith('.png') ? 'png' : 'jpg' });
        if (meta.contentType) headers.set('Content-Type', meta.contentType);
        if (meta.contentLength) headers.set('Content-Length', String(meta.contentLength));
        return new NextResponse(null, { status: 200, headers });
      }
    } catch { /* ignore */ }
    return null;
  });
  const settled = await Promise.allSettled(checks);
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value) return s.value;
  }
  await emitServer(traceId, 'head-404', { keys });
  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}