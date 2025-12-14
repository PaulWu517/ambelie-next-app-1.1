import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // 使用 Edge Runtime 以获得更快的响应

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mime } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    // 广州云函数地址
    const SCF_URL = process.env.NEXT_PUBLIC_SCF_SEGMENTATION_URL || 'https://service-q703080k-1305470656.gz.apigw.tencentcs.com/release/segment';

    // 转发请求到广州云函数
    const scfResp = await fetch(SCF_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64, mime }),
    });

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

