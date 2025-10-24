import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(_req: NextRequest) {
  const filePath = path.join(process.cwd(), "public", "assets", "vi", "avatar.png");
  try {
    const file = await fs.readFile(filePath); // Buffer
    const body = new Uint8Array(file); // Convert to BodyInit-compatible type
    return new Response(body, {
      headers: {
        "Content-Type": "image/png",
        // 强制客户端不缓存，避免移动端长期持有旧图标
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    return new Response("apple-touch-icon not found", { status: 404 });
  }
}