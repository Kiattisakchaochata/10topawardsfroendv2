import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8900";

function getToken(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function mapQuestionFromBackend(q: any) {
  return {
    id: q.id,
    title: q.label ?? "",
    type: q.type ?? "STAR_1_5",
    isActive: q.is_active ?? true,
    order: q.order_no ?? 0,
    required: q.required ?? false,
    key: q.key ?? null,
    createdAt: q.created_at ?? null,
    updatedAt: q.updated_at ?? null,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ สำคัญ
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

    const url = `${BACKEND}/api/admin/stores/${id}/feedback/questions`;
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const raw = await r.text();
    const json = raw ? JSON.parse(raw) : {};

    if (!r.ok) {
      return NextResponse.json(
        { message: json?.message || "backend error" },
        { status: r.status }
      );
    }

    const data = Array.isArray(json?.data) ? json.data.map(mapQuestionFromBackend) : [];
    return NextResponse.json({ store: json?.store, data });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ สำคัญ
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const url = `${BACKEND}/api/admin/stores/${id}/feedback/questions`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await r.text();
    const json = raw ? JSON.parse(raw) : {};

    if (!r.ok) {
      return NextResponse.json(
        { message: json?.message || "backend error" },
        { status: r.status }
      );
    }

    return NextResponse.json(
      { message: json?.message || "created", data: json?.data ? mapQuestionFromBackend(json.data) : null },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "server error" }, { status: 500 });
  }
}