export const runtime = 'nodejs';

import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'vi', 'avatar.png');
    const data = await fs.readFile(filePath); // Buffer
    const body = new Uint8Array(data); // Convert to BodyInit-compatible type
    return new Response(body, {
      headers: {
        'Content-Type': 'image/png',
        // 统一与 apple-touch-icon 的策略，确保客户端不缓存旧图标
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (err) {
    return new Response('favicon not found', { status: 404 });
  }
}