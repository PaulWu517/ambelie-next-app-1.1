import { NextRequest, NextResponse } from 'next/server';
import { ProxyAgent } from 'undici';
import { uploadBufferToCOS, buildTryonKey } from '@/lib/utils/cos';

// Vercel 配置优化
export const runtime = 'nodejs';
export const preferredRegion = ['hkg1', 'sin1', 'nrt1']; // 香港、新加坡、东京 - 更接近 Google API
export const maxDuration = 60; // 60秒超时

// 使用 Gemini 2.5 Flash Image（Nano Banana）进行整头替换生成
const MODEL = 'gemini-2.5-flash-image';

function buildPrompt(measurements?: any, extraPrompt?: string) {
  const base = 'Maintain character consistency.';
  return extraPrompt ? `${base} ${extraPrompt}` : base;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  console.log('[virtual-tryon] start', { model: MODEL, ts: new Date().toISOString() });
  
  // 性能监控时间点
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
    // 新增：topP/topK/seed
    const topPStr = form.get('topP') as string | null;
    const topKStr = form.get('topK') as string | null;
    const seedStr = form.get('seed') as string | null;
    const topP = topPStr ? Math.max(0, Math.min(1, parseFloat(topPStr))) : parseFloat(process.env.GENERATION_TOP_P || '0.98');
    const topK = topKStr ? Math.max(1, Math.min(50, parseInt(topKStr))) : parseInt(process.env.GENERATION_TOP_K || '20');
    const seed = seedStr ? parseInt(seedStr) : (process.env.GENERATION_SEED ? parseInt(process.env.GENERATION_SEED) : undefined);
    console.log('[virtual-tryon] generationConfig', { temperature, topP, topK, seed, traceId });

    // 允许：user_image 必须为 File；model 输入可以是 File 或 URL
    if (!(userImage instanceof File) || (!modelImage && !modelImageUrl)) {
      console.warn('[virtual-tryon] missing inputs', { hasUserFile: userImage instanceof File, hasModelFile: modelImage instanceof File, hasModelUrl: !!modelImageUrl });
      return NextResponse.json({ error: 'Missing images: user_image (File) and model_image (File or model_image_url) are required.' }, { status: 400 });
    }

    // 记录输入元数据（如果是 URL 则记录 URL）
    console.log('[virtual-tryon] input meta', {
      userType: (userImage as File).type, userSize: (userImage as File).size,
      modelType: modelImage instanceof File ? (modelImage as File).type : 'via-url',
      modelUrl: modelImage instanceof File ? undefined : modelImageUrl,
      modelSize: modelImage instanceof File ? (modelImage as File).size : undefined,
    });

    const measurements = measurementsStr ? JSON.parse(measurementsStr) : null;
    console.log('[virtual-tryon] measurements', measurements);

    const toBase64 = async (file: File) => Buffer.from(await file.arrayBuffer()).toString('base64');
    const userBase64 = await toBase64(userImage as File);
    let modelBase64: string;
    let modelMime: string;
    if (modelImage instanceof File) {
      modelBase64 = await toBase64(modelImage as File);
      modelMime = (modelImage as File).type || 'image/jpeg';
    } else {
      // 服务器端拉取参考图，规避前端跨域问题
      const downloadStart = Date.now();
      try {
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
        const resp = await fetch(modelImageUrl, { method: 'GET', ...(dispatcher ? { dispatcher } : {}) });
        if (!resp.ok) {
          console.error('[virtual-tryon] fetch model_image_url failed', { status: resp.status, statusText: resp.statusText, url: modelImageUrl });
          return NextResponse.json({ error: 'Failed to download model_image_url', status: resp.status, statusText: resp.statusText }, { status: 400 });
        }
        const buf = Buffer.from(await resp.arrayBuffer());
        modelBase64 = buf.toString('base64');
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        modelMime = ct.split(';')[0];
        console.log('[virtual-tryon] model image download', { durationMs: Date.now() - downloadStart, size: buf.length });
      } catch (e: any) {
        console.error('[virtual-tryon] network error downloading model_image_url', e?.message);
        return NextResponse.json({ error: 'Network error downloading model_image_url', message: e?.message || String(e) }, { status: 400 });
      }
    }
    
    perf.imageProcessed = Date.now();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[virtual-tryon] missing GEMINI_API_KEY');
      return NextResponse.json({ error: 'Server missing GEMINI_API_KEY. Please set it in .env.local' }, { status: 500 });
    }

    const prompt = buildPrompt(measurements, extraPrompt);
    console.log('[virtual-tryon] prompt built', { promptLength: prompt.length, prompt, traceId });

    // 新增：明确的系统指令，约束图片角色与输出
    const systemInstruction = {
      role: 'system',
      parts: [
        { text: 'You are a clothing replacement AI. Input: person image + clothing reference. Task: Replace person\'s clothing with reference clothing. Keep: original face, pose, background, lighting. Output: Single edited image only, no text, no collages.' }
      ]
    } as any;

    // 将图片顺序设为：第1张为人物底图（user_image），第2张为服装参考（model_image），最后是文本提示
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
        maxOutputTokens: 1024, // 限制输出token数量
        ...(seed !== undefined ? { seed } : {}) 
      }
    } as any;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let resp: Response;
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        ...(dispatcher ? { dispatcher } : {})
      };

      console.log('[virtual-tryon] calling Gemini', { endpoint, viaProxy: !!dispatcher, traceId });
      perf.geminiCalled = Date.now();
      resp = await fetch(endpoint, fetchOptions);
      perf.geminiResponded = Date.now();
      console.log('[virtual-tryon] gemini response', { 
        status: resp.status, 
        statusText: resp.statusText,
        geminiDurationMs: perf.geminiResponded - perf.geminiCalled,
        traceId
      });
    } catch (netErr: any) {
      clearTimeout(timeout);
      const duration = Date.now() - startedAt;
      console.error('[virtual-tryon] network error', netErr?.message);
      return NextResponse.json({ error: 'Network failure when calling Gemini', message: netErr?.message || String(netErr), durationMs: duration }, { status: 502 });
    }

    clearTimeout(timeout);
    const data = await resp.json().catch((e: any) => { console.error('[virtual-tryon] resp.json failed', e?.message); return null; });

    if (!resp.ok) {
      const duration = Date.now() - startedAt;
      console.error('[virtual-tryon] api error', { status: resp.status, details: data });
      return NextResponse.json({ error: 'Gemini API error', status: resp.status, statusText: resp.statusText, details: data, durationMs: duration }, { status: 500 });
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
      return NextResponse.json({ error: 'No image returned from Gemini', raw: data, durationMs: duration }, { status: 500 });
    }

    perf.responseProcessed = Date.now();
    const totalDuration = perf.responseProcessed - perf.start;
    
    console.log('[virtual-tryon] success', { 
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
    // 上传到腾讯云 COS，并返回 imageUrl 以避免大响应体传输
    const buf = Buffer.from(outBase64, 'base64');
    const key = buildTryonKey(traceId, outMime);
    let imageUrl: string | null = null;
    try {
      const uploaded = await uploadBufferToCOS(buf, key, outMime);
      imageUrl = uploaded.url;
    } catch (uploadErr: any) {
      console.error('[virtual-tryon] COS upload failed', uploadErr?.message || uploadErr);
      return NextResponse.json({ error: 'Upload to COS failed', message: uploadErr?.message || String(uploadErr), traceId }, { status: 502 });
    }

    const perfHeader = JSON.stringify({
      formParsing: perf.formParsed - perf.start,
      imageProcessing: perf.imageProcessed - perf.formParsed,
      geminiCall: perf.geminiResponded - perf.geminiCalled,
      responseProcessing: perf.responseProcessed - perf.geminiResponded,
      total: totalDuration
    });
    return NextResponse.json(
      { imageUrl, traceId, mime: outMime, perf: {
        formParsing: perf.formParsed - perf.start,
        imageProcessing: perf.imageProcessed - perf.formParsed,
        geminiCall: perf.geminiResponded - perf.geminiCalled,
        responseProcessing: perf.responseProcessed - perf.geminiResponded,
        total: totalDuration
      } },
      { headers: { 'X-Trace-Id': traceId, 'X-Perf': perfHeader } }
    );
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    console.error('[virtual-tryon] server error', err);
    return NextResponse.json({ error: 'Server error', message: err?.message || String(err), durationMs: duration, stack: err?.stack }, { status: 500 });
  }
}