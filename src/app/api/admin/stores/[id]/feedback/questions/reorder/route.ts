import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

function withAuthHeaders(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  return {
    ...(token ? { Authorization: `Bearer ${token}`, Cookie: `${AUTH_COOKIE}=${token}` } : {}),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();

  const r = await fetch(`${API_URL}/admin/stores/${id}/feedback/questions/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...withAuthHeaders(req) },
    body,
  });

  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "Content-Type": "application/json" } });
}