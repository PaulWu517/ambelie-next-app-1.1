import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToCOS, buildTryonKey } from '@/lib/utils/cos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function emitServer(traceId: string, stage: string, message?: any) {
  try {
    const payload = { traceId, stage, message, ts: new Date().toISOString() };
    const target = process.env.DIAG_LOG_PATH;
    if (target) {
      const fs = await import('fs');
      const path = await import('path');
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(target, `${payload.ts} [trace:${traceId}] [stage:${stage}] ${JSON.stringify(message || '')}\n`, { encoding: 'utf-8' });
    } else {
      console.log('[diagnostic]', payload);
    }
    try {
      const base = process.env.DIAG_POST_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
      const endpoint = `${String(base).replace(/\/$/, '')}/api/diagnostic`;
      const fetchMod = await import('undici');
      const f: any = (fetchMod as any).fetch || (global as any).fetch;
      if (typeof f === 'function') {
        void f(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
      }
    } catch {}
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const traceId: string = body.traceId;
    const mime: string = body.mime || 'image/png';
    const base64: string = body.base64;
    if (!traceId || !base64) {
      return NextResponse.json({ error: 'Missing traceId or base64' }, { status: 400 });
    }
    const buf = Buffer.from(base64, 'base64');
    const key = buildTryonKey(traceId, mime);
    await emitServer(traceId, 'cos-put-start', {
      key,
      mime,
      size: buf.length,
      env: {
        hasSecretId: !!process.env.TENCENT_COS_SECRET_ID,
        hasSecretKey: !!process.env.TENCENT_COS_SECRET_KEY,
        bucket: process.env.TENCENT_COS_BUCKET || 'ambelie-1368352639',
        region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
        basePath: process.env.TRYON_COS_BASE_PATH || 'tryon-results/',
        cdnDomain: process.env.TENCENT_COS_CDN_DOMAIN || 'https://media.ambelie.com'
      }
    });
    const uploaded = await uploadBufferToCOS(buf, key, mime);
    await emitServer(traceId, 'cos-put-success', { key, url: uploaded.url });
    return NextResponse.json({ ok: true, url: uploaded.url });
  } catch (err: any) {
    await emitServer('unknown', 'cos-put-error', { error: err?.message || String(err) });
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}