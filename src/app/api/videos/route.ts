import { NextRequest, NextResponse } from "next/server";

const ORIGIN = (process.env.API_INTERNAL_ORIGIN || "http://127.0.0.1:8900").replace(/\/$/, "");
const API = `${ORIGIN}/api`;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(`${API}/videos`);
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const upstream = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  } catch (e: any) {
    console.error("videos GET proxy error:", e);
    return NextResponse.json({ message: e?.message || "internal error" }, { status: 500 });
  }
}