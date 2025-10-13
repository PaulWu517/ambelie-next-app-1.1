export const runtime = 'nodejs';

import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'vi', 'avatar.png');
    const data = await fs.readFile(filePath);
    return new Response(data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    return new Response('favicon not found', { status: 404 });
  }
}