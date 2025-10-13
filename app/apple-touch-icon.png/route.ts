import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(_req: NextRequest) {
  const filePath = path.join(process.cwd(), "public", "assets", "vi", "avatar.png");
  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": "image/png",
        // Cache for 1 day on clients; CDN/proxy can cache longer if needed
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    return new Response("apple-touch-icon not found", { status: 404 });
  }
}