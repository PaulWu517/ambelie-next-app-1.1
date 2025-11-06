import { NextRequest, NextResponse } from 'next/server';
import { getBufferFromCOS } from '@/lib/utils/cos';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { traceId: string } }) {
  const traceId = params.traceId;
  const url = new URL(req.url);
  const ext = (url.searchParams.get('ext') || 'png').toLowerCase();
  const basePath = process.env.TRYON_COS_BASE_PATH || 'tryon-results/';
  const key = `${basePath}${traceId}.${ext}`;
  try {
    const { buf, mime } = await getBufferFromCOS(key);
    return new NextResponse(buf, { headers: { 'Content-Type': mime || (ext === 'png' ? 'image/png' : 'image/jpeg'), 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('[virtual-tryon-result] fetch from COS failed', { key, msg });
    return NextResponse.json({ error: 'Not found', message: msg, key }, { status: 404 });
  }
}