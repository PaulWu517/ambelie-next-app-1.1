import { NextRequest, NextResponse } from 'next/server';

// NOTE:
// Edge Runtime 在 Vercel 上有“25s 内必须返回首包”的限制。
// 伦敦用户 -> Vercel Edge -> 广州 APIGW 的跨境链路偶发 >25s，会导致函数被强制停止：
// "Your function was stopped as it did not return an initial response within 25s"
// 因此这里改为 Node.js runtime，并加显式超时，避免页面无限 Loading。
export const runtime = 'nodejs';
// Vercel/Next Route Handler 支持 maxDuration（在支持的平台上生效）
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mime } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    // 分割云函数地址（优先使用服务端环境变量，避免把“配置”绑到 NEXT_PUBLIC 上）
    const SCF_URL =
      process.env.SCF_SEGMENTATION_URL ||
      process.env.NEXT_PUBLIC_SCF_SEGMENTATION_URL ||
      'https://service-q703080k-1305470656.gz.apigw.tencentcs.com/release/segment';

    // 转发请求到广州云函数
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s 超时，避免无尽等待
    let scfResp: Response;
    try {
      scfResp = await fetch(SCF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mime }),
        signal: controller.signal,
      });
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError';
      return NextResponse.json(
        { error: isAbort ? 'Segmentation timeout' : 'Segmentation proxy fetch failed', details: e?.message || String(e) },
        { status: isAbort ? 504 : 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!scfResp.ok) {
      const errorText = await scfResp.text();
      console.error('[API/Segment] SCF error:', scfResp.status, errorText);
      return NextResponse.json({ error: `SCF failed: ${scfResp.status}`, details: errorText }, { status: scfResp.status });
    }

    const data = await scfResp.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API/Segment] Proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

