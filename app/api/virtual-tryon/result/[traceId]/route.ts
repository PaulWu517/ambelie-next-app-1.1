import { NextResponse } from 'next/server';
import { getBufferFromCOS } from '@/lib/utils/cos';

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: Promise<{ traceId: string }> }) {
  const { traceId } = await ctx.params;
  const url = new URL(req.url);
  const ext = (url.searchParams.get('ext') || 'png').toLowerCase();
  const basePath = process.env.TRYON_COS_BASE_PATH || 'tryon-results/';
  const key = `${basePath}${traceId}.${ext}`;
  try {
    const { buf, mime } = await getBufferFromCOS(key);
    // The Node.js Buffer from COS SDK might be backed by a SharedArrayBuffer,
    // which is not compatible with Blob or NextResponse constructors.
    // We must explicitly copy it into a new, non-shared ArrayBuffer.
    const arrayBuffer = new ArrayBuffer(buf.length);
    const view = new Uint8Array(arrayBuffer);
    view.set(buf);

    return new NextResponse(arrayBuffer, { headers: { 'Content-Type': mime || (ext === 'png' ? 'image/png' : 'image/jpeg'), 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('[virtual-tryon-result] fetch from COS failed', { key, msg });
    return NextResponse.json({ error: 'Not found', message: msg, key }, { status: 404 });
  }
}