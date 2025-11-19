import { NextRequest, NextResponse } from 'next/server';
import { ProxyAgent } from 'undici';
import { uploadBufferToCOS, buildTryonKey, objectExistsInCOS } from '@/lib/utils/cos';

// Vercel 配置优化
// 优先选择更接近Gemini API的区域（us-central1），减少网络延迟
// 如果主要用户在中国，可以优先使用 hkg1 (香港) 或 sin1 (新加坡)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 优化区域选择：优先使用延迟最低的区域
// 根据实际测试，可以调整顺序：如果Gemini API响应快，优先选择用户就近区域
export const preferredRegion = ['iad1', 'hkg1', 'sin1', 'nrt1']; // iad1 (US East) 更接近Gemini API
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
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
      // 优化图片下载：添加重试机制，提升生产环境稳定性
      const maxDownloadRetries = 2; // 最多重试2次
      let downloadSuccess = false;
      let lastDownloadError: any = null;
      
      for (let attempt = 0; attempt <= maxDownloadRetries; attempt++) {
        const downloadController = new AbortController();
        // 每次尝试的超时时间：首次10秒，重试时8秒
        const downloadTimeoutMs = attempt === 0 ? 10000 : 8000;
        const downloadTimeout = setTimeout(() => downloadController.abort(), downloadTimeoutMs);
        
        try {
          if (attempt > 0) {
            await emitServer(traceId, 'model-image-download-retry', { attempt, maxDownloadRetries, url: modelImageUrl });
            // 重试前等待
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
          }
          
          const resp = await fetch(modelImageUrl, { 
            method: 'GET', 
            signal: downloadController.signal,
            headers: {
              'User-Agent': 'Ambelie-VirtualTryOn/1.0',
              'Accept': 'image/*'
            },
            ...(dispatcher ? { dispatcher } : {}) 
          });
          clearTimeout(downloadTimeout);
          
          if (!resp.ok) {
            // 对于5xx错误，进行重试
            if (resp.status >= 500 && attempt < maxDownloadRetries) {
              await emitServer(traceId, 'model-image-download-retry-wait', { status: resp.status, attempt });
              continue;
            }
            console.error('[virtual-tryon] fetch model_image_url failed', { status: resp.status, statusText: resp.statusText, url: modelImageUrl, attempt });
            throw { error: 'Failed to download model_image_url', status: resp.status, statusText: resp.statusText };
          }
          
          const buf = Buffer.from(await resp.arrayBuffer());
          modelBase64 = buf.toString('base64');
          const ct = resp.headers.get('content-type') || 'image/jpeg';
          modelMime = ct.split(';')[0];
          downloadSuccess = true;
          await emitServer(traceId, 'model-image-download-success', { durationMs: Date.now() - downloadStart, size: buf.length, attempt });
          if (DEBUG) console.log('[virtual-tryon] model image download', { durationMs: Date.now() - downloadStart, size: buf.length, attempt });
          break; // 成功，跳出重试循环
        } catch (fetchErr: any) {
          clearTimeout(downloadTimeout);
          lastDownloadError = fetchErr;
          
          if (fetchErr.name === 'AbortError') {
            if (attempt < maxDownloadRetries) {
              await emitServer(traceId, 'model-image-download-timeout-retry', { timeoutMs: downloadTimeoutMs, attempt });
              continue;
            }
            throw { error: 'Model image download timeout', message: `Download exceeded ${downloadTimeoutMs}ms timeout after ${attempt + 1} attempts`, status: 408 };
          }
          
          // 对于网络错误，进行重试
          if (attempt < maxDownloadRetries && (fetchErr.message?.includes('fetch') || fetchErr.message?.includes('network'))) {
            await emitServer(traceId, 'model-image-download-retry-wait', { error: fetchErr.message, attempt });
            continue;
          }
          
          // 最后一次尝试失败，抛出错误
          if (attempt === maxDownloadRetries) {
            console.error('[virtual-tryon] network error downloading model_image_url after retries', { message: fetchErr?.message, attempts: attempt + 1, url: modelImageUrl });
            await emitServer(traceId, 'model-image-download-error', { message: fetchErr?.message || String(fetchErr), durationMs: Date.now() - downloadStart, attempts: attempt + 1 });
            if (fetchErr.error) throw fetchErr; // re-throw our own structured error
            throw { error: 'Network error downloading model_image_url', message: fetchErr?.message || String(fetchErr), status: 400 };
          }
        }
      }
      
      if (!downloadSuccess) {
        console.error('[virtual-tryon] model image download failed after all retries', { url: modelImageUrl, attempts: maxDownloadRetries + 1 });
        await emitServer(traceId, 'model-image-download-error', { message: lastDownloadError?.message || 'Unknown error', durationMs: Date.now() - downloadStart, attempts: maxDownloadRetries + 1 });
        throw { error: 'Failed to download model_image_url after retries', message: lastDownloadError?.message || 'Unknown error', status: 400 };
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

    // 优化Gemini API调用：添加重试机制，提升生产环境稳定性
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
    const maxRetries = 2; // 最多重试2次
    let resp: Response | null = null;
    let lastError: any = null;
    
    perf.geminiCalled = Date.now();
    await emitServer(traceId, 'gemini-call-start', { model: MODEL });
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      // 每次尝试的超时时间：首次60秒，重试时45秒
      const timeoutMs = attempt === 0 ? 60000 : 45000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        // 优化请求头，添加keep-alive和压缩支持，提升生产环境性能
        const fetchOptions: any = {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          ...(dispatcher ? { dispatcher } : {})
        };

        if (DEBUG) console.log('[virtual-tryon] calling Gemini', { endpoint, viaProxy: !!dispatcher, attempt, traceId });
        if (attempt > 0) {
          await emitServer(traceId, 'gemini-call-retry', { attempt, maxRetries });
        }
        
        resp = await fetch(endpoint, fetchOptions);
        clearTimeout(timeout);
        
        perf.geminiResponded = Date.now();
        await emitServer(traceId, 'gemini-call-end', { durationMs: perf.geminiResponded - perf.geminiCalled, status: resp.status, attempt });
        
        if (DEBUG) console.log('[virtual-tryon] gemini response', { 
          status: resp.status, 
          statusText: resp.statusText,
          geminiDurationMs: perf.geminiResponded - perf.geminiCalled,
          attempt,
          traceId
        });
        
        // 如果响应成功，跳出重试循环
        if (resp.ok || resp.status < 500) break;
        
        // 对于5xx错误，进行重试
        if (resp.status >= 500 && attempt < maxRetries) {
          const waitMs = (attempt + 1) * 1000; // 递增等待时间：1s, 2s
          await emitServer(traceId, 'gemini-call-retry-wait', { status: resp.status, waitMs, attempt });
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
      } catch (netErr: any) {
        clearTimeout(timeout);
        lastError = netErr;
        
        // 对于超时或网络错误，进行重试
        if ((netErr.name === 'AbortError' || netErr.message?.includes('fetch')) && attempt < maxRetries) {
          const waitMs = (attempt + 1) * 1000;
          await emitServer(traceId, 'gemini-call-retry-wait', { error: netErr.name || netErr.message, waitMs, attempt });
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        
        // 最后一次尝试失败，抛出错误
        if (attempt === maxRetries) {
          const duration = Date.now() - startedAt;
          console.error('[virtual-tryon] network error after retries', { message: netErr?.message, attempts: attempt + 1 });
          throw { error: 'Network failure when calling Gemini', message: netErr?.message || String(netErr), durationMs: duration, status: 502 };
        }
      }
    }
    
    if (!resp) {
      const duration = Date.now() - startedAt;
      console.error('[virtual-tryon] no response after retries', { attempts: maxRetries + 1 });
      throw { error: 'No response from Gemini API', message: lastError?.message || 'Unknown error', durationMs: duration, status: 502 };
    }
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
    
    // 关键优化：立即返回原始图片，不等待Sharp压缩
    // 对于二进制预览请求，直接返回原始图片，大幅减少响应时间
    // Sharp压缩改为后台异步进行，或在前端需要时再进行
    const previewBase64 = outBase64; // 直接使用原始图片
    const previewMime = outMime || 'image/png';
    const dataUrl = `data:${previewMime};base64,${previewBase64}`;
    
    // 后台异步压缩（可选，用于后续优化或缓存）
    // 不阻塞主响应流程
    (async () => {
      try {
        const t0 = Date.now();
        const sharpMod = await import('sharp');
        const sharpFn: any = (sharpMod as any).default || sharpMod;
        const compressedBuf = await sharpFn(origBuf)
          .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75, effort: 4, smartSubsample: true })
          .toBuffer();
        await emitServer(traceId, 'sharp-preview-success', { inSize: origBuf.length, outSize: compressedBuf.length, durationMs: Date.now() - t0 });
      } catch (e: any) {
        await emitServer(traceId, 'sharp-preview-error', { message: e?.message || String(e) });
      }
    })().catch(() => {}); // 静默处理错误，不影响主流程
    
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
      const buf = Buffer.from(result.base64, 'base64');
      // Convert Buffer to non-shared ArrayBuffer for NextResponse
      const arrayBuffer = new ArrayBuffer(buf.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(buf);
      
      // 先立即返回预览图片，不等待 COS 上传，提升响应速度
      await emitServer(result.traceId, 'preview-binary-return', { size: buf.length, mime: result.mime });
      
      // 确保 header 值只包含 ASCII 字符，避免 ByteString 转换错误
      // 如果包含非ASCII字符，使用 Base64 编码；否则直接使用
      const hasNonAscii = (str: string) => /[^\x00-\x7F]/.test(str);
      const traceIdHasNonAscii = hasNonAscii(result.traceId);
      const safeTraceId = traceIdHasNonAscii 
        ? Buffer.from(result.traceId, 'utf8').toString('base64')
        : result.traceId;
      const mimeValue = result.mime || 'image/png';
      const mimeHasNonAscii = hasNonAscii(mimeValue);
      const safeMime = mimeHasNonAscii
        ? Buffer.from(mimeValue, 'utf8').toString('base64')
        : mimeValue;
      // 记录非ASCII字符处理情况，便于调试
      if (traceIdHasNonAscii || mimeHasNonAscii) {
        await emitServer(result.traceId, 'header-nonascii-encoded', { 
          traceIdEncoded: traceIdHasNonAscii, 
          mimeEncoded: mimeHasNonAscii 
        });
      }
      
      // 后台异步上传原图到 COS，不阻塞响应返回
      const key = buildTryonKey(result.traceId, result.origMime);
      (async () => {
        try {
          const exists = await objectExistsInCOS(key);
          if (!exists.exists) {
            await emitServer(result.traceId, 'cos-upload-start', { key, mime: result.origMime, size: result.origBuf.length });
            await uploadBufferToCOS(result.origBuf, key, result.origMime);
            await emitServer(result.traceId, 'cos-upload-success', { key });
          } else {
            await emitServer(result.traceId, 'cos-upload-skip-exists', { key, contentLength: exists.contentLength, contentType: exists.contentType });
          }
        } catch (e: any) {
          await emitServer(result.traceId, 'cos-upload-error', { key, message: e?.message || String(e) });
        }
      })().catch(() => {}); // 静默处理错误，不影响主流程
      
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': result.mime || 'image/png',
          'Cache-Control': 'no-store',
          'X-TraceId': safeTraceId,
          'X-Mime': safeMime
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