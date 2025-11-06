import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function safeAppend(filePath: string, line: string) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, line + '\n', { encoding: 'utf-8' });
    return true;
  } catch (e) {
    console.warn('[diagnostic] append failed', (e as any)?.message);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { traceId, stage, message, ts, extra } = body || {};
    const now = ts || new Date().toISOString();
    const line = `${now} [trace:${traceId || '-'}] [stage:${stage || '-'}] ${typeof message === 'string' ? message : JSON.stringify(message)} ${extra ? JSON.stringify(extra) : ''}`;

    // If DIAG_LOG_PATH env is provided, try append; otherwise just log to console
    const target = process.env.DIAG_LOG_PATH;
    if (target) {
      const ok = safeAppend(target, line);
      if (!ok) console.log('[diagnostic]', line);
    } else {
      console.log('[diagnostic]', line);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[diagnostic] error', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}