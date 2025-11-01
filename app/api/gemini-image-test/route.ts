import { NextRequest, NextResponse } from 'next/server';
import { ProxyAgent } from 'undici';

// 简单文本转图片测试：用于验证 Nano Banana (gemini-2.5-flash-image) 可用性与网络连通性
const MODEL = 'gemini-2.5-flash-image';

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt') || 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[gemini-test] missing GEMINI_API_KEY');
    return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
  }

  console.log('[gemini-test] start', { model: MODEL, promptLength: prompt.length });

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [ { text: prompt } ]
      }
    ]
  } as any;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
    const fetchOptions: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {})
    };

    console.log('[gemini-test] calling', { endpoint, viaProxy: !!dispatcher });
    const resp = await fetch(endpoint, fetchOptions);
    clearTimeout(timeout);

    let data: any = null;
    try { data = await resp.json(); } catch (e: any) { console.log('[gemini-test] resp.json failed', e?.message); }

    if (!resp.ok) {
      console.error('[gemini-test] api error', { status: resp.status, statusText: resp.statusText, details: data });
      return NextResponse.json({ error: 'Gemini API error', status: resp.status, statusText: resp.statusText, details: data }, { status: 500 });
    }

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = (p as any)?.inline_data || (p as any)?.inlineData;
      const mime = inline?.mime_type || inline?.mimeType;
      if (inline && mime && String(mime).startsWith('image/')) {
        console.log('[gemini-test] success', { mime, base64Len: inline.data?.length, durationMs: Date.now() - startedAt });
        return NextResponse.json({ imageBase64: inline.data, mimeType: mime, durationMs: Date.now() - startedAt });
      }
    }

    console.warn('[gemini-test] no image', { raw: data });
    return NextResponse.json({ error: 'No image in response', raw: data }, { status: 500 });
  } catch (e: any) {
    clearTimeout(timeout);
    console.error('[gemini-test] network error', e?.message);
    return NextResponse.json({ error: 'Network failure when calling Gemini', message: e?.message || String(e), durationMs: Date.now() - startedAt }, { status: 502 });
  }
}