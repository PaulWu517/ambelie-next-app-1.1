import { NextRequest, NextResponse } from 'next/server';
import { ProxyAgent } from 'undici';
import { uploadBufferToCOS, buildTryonKey, objectExistsInCOS } from '@/lib/utils/cos';

// Vercel 配置优化
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = ['hkg1', 'sin1', 'nrt1'];
export const maxDuration = 60;

const MODEL = 'gemini-2.5-flash-image';
const DEBUG = process.env.VIRTUAL_TRYON_DEBUG === '1';

function buildPrompt(measurements?: any, extraPrompt?: string) {
  const base = 'Maintain character consistency.Front-facing photo.';
  return extraPrompt ? `${base} ${extraPrompt}` : base;
}

// Server-side diagnostic emitter: append to DIAG_LOG_PATH if set, else console.log
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

// The core logic is moved into this function.
// It throws a serializable object on error, and returns a serializable object on success.
async function handleVirtualTryon(req: NextRequest) {
  const startedAt = Date.now();
  if (DEBUG) console.log('[virtual-tryon] start', { model: MODEL, ts: new Date().toISOString() });
  
  const perf = {
    start: startedAt,
    formParsed: 0,
    imageProcessed: 0,
    geminiCalled: 0,
    geminiResponded: 0,
    responseProcessed: 0
  };
  
  try {
    const form = await req.formData();
    perf.formParsed = Date.now();
    
    const userImage = form.get('user_image');
    const modelImage = form.get('model_image');
    const modelImageUrl = (form.get('model_image_url') as string) || '';
    const measurementsStr = form.get('measurements') as string | null;
    const extraPrompt = (form.get('prompt') as string) || '';
    const traceId = (form.get('traceId') as string) || `tryon-${Date.now()}`;
    const tempStr = form.get('temperature') as string | null;
    const temperature = tempStr ? Math.max(0, Math.min(2, parseFloat(tempStr))) : parseFloat(process.env.GENERATION_TEMPERATURE || '0');
    const topPStr = form.get('topP') as string | null;
    const topKStr = form.get('topK') as string | null;
    const seedStr = form.get('seed') as string | null;
    const topP = topPStr ? Math.max(0, Math.min(1, parseFloat(topPStr))) : parseFloat(process.env.GENERATION_TOP_P || '0.98');
    const topK = topKStr ? Math.max(1, Math.min(50, parseInt(topKStr))) : parseInt(process.env.GENERATION_TOP_K || '20');
    const seed = seedStr ? parseInt(seedStr) : (process.env.GENERATION_SEED ? parseInt(process.env.GENERATION_SEED) : undefined);
    if (DEBUG) console.log('[virtual-tryon] generationConfig', { temperature, topP, topK, seed, traceId });

    if (!(userImage instanceof File) || (!modelImage && !modelImageUrl)) {
      console.warn('[virtual-tryon] missing inputs', { hasUserFile: userImage instanceof File, hasModelFile: modelImage instanceof File, hasModelUrl: !!modelImageUrl });
      throw { error: 'Missing images: user_image (File) and model_image (File or model_image_url) are required.', status: 400 };
    }

    if (DEBUG) console.log('[virtual-tryon] input meta', {
      userType: (userImage as File).type, userSize: (userImage as File).size,
      modelType: modelImage instanceof File ? (modelImage as File).type : 'via-url',
      modelUrl: modelImage instanceof File ? undefined : modelImageUrl,
      modelSize: modelImage instanceof File ? (modelImage as File).size : undefined,
    });

    const measurements = measurementsStr ? JSON.parse(measurementsStr) : null;
    if (DEBUG) console.log('[virtual-tryon] measurements', measurements);

    const toBase64 = async (file: File) => Buffer.from(await file.arrayBuffer()).toString('base64');
    const userBase64 = await toBase64(userImage as File);
    let modelBase64: string;
    let modelMime: string;
    if (modelImage instanceof File) {
      modelBase64 = await toBase64(modelImage as File);
      modelMime = (modelImage as File).type || 'image/jpeg';
    } else {
      const downloadStart = Date.now();
      try {
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
        const resp = await fetch(modelImageUrl, { method: 'GET', ...(dispatcher ? { dispatcher } : {}) });
        if (!resp.ok) {
          console.error('[virtual-tryon] fetch model_image_url failed', { status: resp.status, statusText: resp.statusText, url: modelImageUrl });
          throw { error: 'Failed to download model_image_url', status: resp.status, statusText: resp.statusText };
        }
        const buf = Buffer.from(await resp.arrayBuffer());
        modelBase64 = buf.toString('base64');
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        modelMime = ct.split(';')[0];
        if (DEBUG) console.log('[virtual-tryon] model image download', { durationMs: Date.now() - downloadStart, size: buf.length });
      } catch (e: any) {
        console.error('[virtual-tryon] network error downloading model_image_url', e?.message);
        if (e.error) throw e; // re-throw our own structured error
        throw { error: 'Network error downloading model_image_url', message: e?.message || String(e), status: 400 };
      }
    }
    
    perf.imageProcessed = Date.now();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[virtual-tryon] missing GEMINI_API_KEY');
      throw { error: 'Server missing GEMINI_API_KEY. Please set it in .env.local', status: 500 };
    }

    const prompt = buildPrompt(measurements, extraPrompt);
    if (DEBUG) console.log('[virtual-tryon] prompt built', { promptLength: prompt.length, prompt, traceId });

    const systemInstruction = {
      role: 'system',
      parts: [
        { text: 'You are a clothing replacement AI. Input: person image + clothing reference. Task: Replace person\'s clothing with reference clothing. Keep: original face, pose, background, lighting. Output: Single edited image only, no text, no collages.' }
      ]
    } as any;

    const payload = {
      systemInstruction,
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: ((userImage as File).type || 'image/jpeg'), data: userBase64 } },
            { inline_data: { mime_type: (modelImage instanceof File ? ((modelImage as File).type || 'image/jpeg') : (modelMime || 'image/jpeg')), data: modelBase64 } },
            { text: prompt }
          ]
        }
      ],
      generationConfig: { 
        temperature, 
        topP, 
        topK, 
        candidateCount: 1, 
        maxOutputTokens: 1024,
        ...(seed !== undefined ? { seed } : {}) 
      }
    } as any;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let resp: Response;
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

      if (DEBUG) console.log('[virtual-tryon] calling Gemini', { endpoint, viaProxy: !!dispatcher, traceId });
      perf.geminiCalled = Date.now();
      resp = await fetch(endpoint, fetchOptions);
      perf.geminiResponded = Date.now();
      if (DEBUG) console.log('[virtual-tryon] gemini response', { 
        status: resp.status, 
        statusText: resp.statusText,
        geminiDurationMs: perf.geminiResponded - perf.geminiCalled,
        traceId
      });
    } catch (netErr: any) {
      clearTimeout(timeout);
      const duration = Date.now() - startedAt;
      console.error('[virtual-tryon] network error', netErr?.message);
      throw { error: 'Network failure when calling Gemini', message: netErr?.message || String(netErr), durationMs: duration, status: 502 };
    }

    clearTimeout(timeout);
    const data = await resp.json().catch((e: any) => { console.error('[virtual-tryon] resp.json failed', e?.message); return null; });

    if (!resp.ok) {
      const duration = Date.now() - startedAt;
      console.error('[virtual-tryon] api error', { status: resp.status, details: data });
      throw { error: 'Gemini API error', status: resp.status, statusText: resp.statusText, details: data, durationMs: duration };
    }

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let outBase64: string | null = null;
    let outMime: string = 'image/png';
    for (const p of parts) {
      const inline = (p as any)?.inline_data || (p as any)?.inlineData;
      const mime = inline?.mime_type || inline?.mimeType;
      if (inline && mime && String(mime).startsWith('image/')) {
        outBase64 = inline.data;
        outMime = mime;
        break;
      }
    }

    if (!outBase64) {
      const duration = Date.now() - startedAt;
      console.warn('[virtual-tryon] no image in response', { partsCount: parts?.length, sample: parts?.[0] });
      throw { error: 'No image returned from Gemini', raw: data, durationMs: duration, status: 500 };
    }

    perf.responseProcessed = Date.now();
    const totalDuration = perf.responseProcessed - perf.start;
    
    if (DEBUG) console.log('[virtual-tryon] success', { 
      mime: outMime, 
      base64Len: outBase64.length, 
      durationMs: totalDuration,
      breakdown: {
        formParsing: perf.formParsed - perf.start,
        imageProcessing: perf.imageProcessed - perf.formParsed,
        geminiCall: perf.geminiResponded - perf.geminiCalled,
        responseProcessing: perf.responseProcessed - perf.geminiResponded,
        total: totalDuration
      },
      traceId
    });
    
    const perfData = {
      formParsing: perf.formParsed - perf.start,
      imageProcessing: perf.imageProcessed - perf.formParsed,
      geminiCall: perf.geminiResponded - perf.geminiCalled,
      responseProcessing: perf.responseProcessed - perf.geminiResponded,
      total: totalDuration
    };

    // Build original buffer
    const origBuf = Buffer.from(outBase64, 'base64');
    // Create a compressed preview (webp 640px) to reduce first-frame size
    let previewBuf = origBuf;
    let previewMime = 'image/webp';
    try {
      const t0 = Date.now();
      const sharpMod = await import('sharp');
      const sharpFn: any = (sharpMod as any).default || sharpMod;
      previewBuf = await sharpFn(origBuf)
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      await emitServer(traceId, 'sharp-preview-success', { inSize: origBuf.length, outSize: previewBuf.length, durationMs: Date.now() - t0 });
    } catch (e: any) {
      previewBuf = origBuf;
      previewMime = outMime || 'image/png';
      await emitServer(traceId, 'sharp-preview-error', { message: e?.message || String(e) });
    }

    const previewBase64 = previewBuf.toString('base64');
    const dataUrl = `data:${previewMime};base64,${previewBase64}`;
    return { traceId, mime: previewMime, base64: previewBase64, dataUrl, perf: perfData, origBuf, origMime: outMime, origBase64: outBase64 };

  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error('[virtual-tryon] unhandled server error', err);
    // Ensure the thrown object is serializable and has a consistent shape
    if (err.error) { // re-throw if it's already our structured error
        throw { ...err, durationMs: duration };
    }
    throw { error: 'Unhandled server error', message: err?.message || String(err), durationMs: duration, stack: err?.stack, status: 500 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await handleVirtualTryon(req);
    // 支持首帧二进制预览：通过 query 参数 format=blob 或 Accept:image/*
    const url = new URL(req.url);
    const format = (url.searchParams.get('format') || '').toLowerCase();
    const accept = (req.headers.get('accept') || '').toLowerCase();
    if (format === 'blob' || accept.includes('image/')) {
      // 🔥 最终优化方案：返回预览图 + COS URL（避免传输大文件）
      const previewDataUrl = result.dataUrl; // webp 预览图 DataURL (~20KB)
      const key = buildTryonKey(result.traceId, result.origMime);
      
      await emitServer(result.traceId, 'fast-preview-return', { 
        previewSize: previewDataUrl.length,
        originalSize: result.origBuf.length,
        mime: result.origMime
      });
      
      // 同步上传原图到 COS（最多等待 5 秒）
      let cosUrl: string | null = null;
      const uploadPromise = (async () => {
        try {
          const exists = await objectExistsInCOS(key);
          if (!exists.exists) {
            await emitServer(result.traceId, 'cos-upload-start', { key, size: result.origBuf.length });
            const uploaded = await uploadBufferToCOS(result.origBuf, key, result.origMime);
            cosUrl = uploaded.url;
            await emitServer(result.traceId, 'cos-upload-success', { key, url: cosUrl });
            return cosUrl;
          } else {
            cosUrl = `${process.env.TENCENT_COS_CDN_DOMAIN || 'https://media.ambelie.com'}/${key}`;
            await emitServer(result.traceId, 'cos-already-exists', { url: cosUrl });
            return cosUrl;
          }
        } catch (e: any) {
          await emitServer(result.traceId, 'cos-upload-error', { error: e?.message || String(e) });
          throw e;
        }
      })();
      
      await Promise.race([
        uploadPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]).catch(() => {
        // 超时或失败：返回 Base64 兜底
        emitServer(result.traceId, 'cos-upload-timeout-fallback', { waited: 5000 });
      });
      
      return NextResponse.json({
        traceId: result.traceId,
        preview: previewDataUrl,           // 预览图 DataURL（立即显示）
        originalUrl: cosUrl,                // 原图 COS URL（优先）
        originalFallback: cosUrl ? null : `data:${result.origMime};base64,${result.origBase64}`, // Base64 兜底
        mime: result.origMime,
        previewMime: result.mime
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-TraceId': result.traceId,
          'X-Has-COS-URL': cosUrl ? 'true' : 'false'
        }
      });
    }
    // 默认返回 JSON，用于兼容旧客户端
    try {
      const payload = { traceId: result.traceId, mime: result.origMime, base64: (result as any).origBase64 };
      if (payload.traceId && payload.mime && payload.base64) {
        await emitServer(result.traceId, 'server-auto-upload-start', { mime: payload.mime });
        try {
          const base = process.env.DIAG_POST_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
          const endpoint = `${String(base).replace(/\/$/, '')}/api/virtual-tryon/upload`;
          const fetchMod = await import('undici');
          const f: any = (fetchMod as any).fetch || (global as any).fetch;
          if (typeof f === 'function') {
            void f(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
          }
        } catch (e: any) {
          await emitServer(result.traceId, 'server-auto-upload-error', e?.message || String(e));
        }
      } else {
        await emitServer(result.traceId, 'server-auto-upload-skip', { hasOrigBase64: !!(result as any).origBase64 });
      }
    } catch {}
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    const payload = typeof error === 'object' && error !== null ? error : { error: 'Unknown error' };
    const status = payload?.status || 500;
    return NextResponse.json(payload, {
      status,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}