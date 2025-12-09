// src/app/api/proxy/image/route.ts
import { NextRequest, NextResponse } from "next/server";

// src/app/api/proxy/image/route.ts

// จะใช้ "edge" หรือ "nodejs" ก็ได้ แล้วแต่โปรเจกต์ / hosting
export const runtime = "edge";

// จำกัด host ที่อนุญาต ไม่ให้กลายเป็น open proxy
const ALLOWED_HOSTS = [
  // TikTok CDN หลัก ๆ
  "p16-common-sign.tiktokcdn-us.com",
  "p19-common-sign.tiktokcdn-us.com",
  "p16-sign.tiktokcdn.com",
  "p16-sign-va.tiktokcdn.com",
  "p16-sign-sg.tiktokcdn.com", // จาก log เดิม
  // YouTube thumbnail
  "img.youtube.com",
  "i.ytimg.com",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const u = searchParams.get("u");
  if (!u) {
    return new Response("Missing u", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(u);
    if (!/^https?:$/.test(target.protocol)) {
      return new Response("Bad URL", { status: 400 });
    }
  } catch {
    return new Response("Bad URL", { status: 400 });
  }

  // อนุญาตเฉพาะ host ที่เราระบุไว้
  const allowed = ALLOWED_HOSTS.some(
    (h) => target.hostname === h || target.hostname.endsWith(`.${h}`)
  );
  if (!allowed) {
    return new Response("Host not allowed", { status: 400 });
  }

  try {
    const isTikTokCdn = target.hostname.includes("tiktokcdn");

    const upstream = await fetch(target.toString(), {
      headers: isTikTokCdn ? { Referer: "https://www.tiktok.com/" } : undefined,
      redirect: "follow",
    });

    if (!upstream.ok) {
      console.error(
        "[image-proxy] upstream error",
        upstream.status,
        target.toString()
      );
      // ส่ง status จริงกลับไปเลย (404 ก็ 404, 403 ก็ 403)
      return new Response(`Upstream ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

    // stream body ตรง ๆ
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
        "x-proxied-from": target.hostname,
      },
    });
  } catch (err) {
    console.error("[image-proxy] exception", err);
    return new Response("Proxy error", { status: 500 });
  }
}