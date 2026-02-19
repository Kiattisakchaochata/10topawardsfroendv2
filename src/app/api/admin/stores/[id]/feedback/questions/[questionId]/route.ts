import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8899";

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

type Ctx = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

    const { id, questionId } = await ctx.params; // ✅ สำคัญ: await params
    const body = await req.json().catch(() => ({}));

    const url = `${BACKEND}/api/admin/stores/${id}/feedback/questions/${questionId}`;
    const r = await fetch(url, {
      method: "PATCH",
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

    return NextResponse.json({
      message: json?.message || "updated",
      data: json?.data ? mapQuestionFromBackend(json.data) : null,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

    const { id, questionId } = await ctx.params; // ✅ await params

    const url = `${BACKEND}/api/admin/stores/${id}/feedback/questions/${questionId}`;
    const r = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const raw = await r.text();
    const json = raw ? JSON.parse(raw) : {};

    if (!r.ok) {
      return NextResponse.json(
        { message: json?.message || "backend error" },
        { status: r.status }
      );
    }

    return NextResponse.json({ message: json?.message || "deleted" });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "server error" }, { status: 500 });
  }
}