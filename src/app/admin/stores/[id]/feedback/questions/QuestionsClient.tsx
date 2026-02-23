"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { StoreFeedbackQuestion, QuestionType } from "./page";

type Props = {
  storeId: string;
  initialQuestions: StoreFeedbackQuestion[];
  initialError: string | null;

  // เผื่อ page.tsx ยังส่งมาอยู่ก็ได้ แต่เราไม่ใช้แล้ว
  apiBaseUrl?: string;
};

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "STAR", label: "ให้คะแนน (ดาว)" },
  { value: "TEXT", label: "ข้อความ" },
  { value: "YESNO", label: "ใช่/ไม่ใช่" },
  { value: "CHOICE", label: "ตัวเลือก" },
];

function sortByOrder(a: StoreFeedbackQuestion, b: StoreFeedbackQuestion) {
  return (a.order ?? 0) - (b.order ?? 0);
}

function typeLabel(t: QuestionType) {
  return TYPES.find((x) => x.value === t)?.label ?? t;
}

export default function QuestionsClient({
  storeId,
  initialQuestions,
  initialError,
}: Props) {
  const [items, setItems] = useState<StoreFeedbackQuestion[]>(
    [...(initialQuestions || [])].sort(sortByOrder)
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(initialError);

  // create form
  const [title, setTitle] = useState("");
  const [type, setType] = useState<QuestionType>("STAR");

  // edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editItem, setEditItem] = useState<StoreFeedbackQuestion | null>(null);

  // delete confirm
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteItem, setDeleteItem] = useState<StoreFeedbackQuestion | null>(null);

  // ✅ auto next order = max+1
  const nextOrder = useMemo(() => {
    const max = items.reduce((m, it) => Math.max(m, it.order || 0), 0);
    return max + 1;
  }, [items]);

  /**
   * ✅ ยิงผ่าน Next route handler (/api/...) เท่านั้น
   * - list/create: /api/admin/stores/:id/feedback/questions
   * - reorder:     /api/admin/stores/:id/feedback/questions/reorder
   * - patch/delete:/api/admin/stores/:id/feedback/questions/:questionId
   */
  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      credentials: "include",
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }

    // บาง endpoint (เช่น DELETE) อาจตอบกลับเป็น empty
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ data: StoreFeedbackQuestion[] }>(
        `/api/admin/stores/${storeId}/feedback/questions`
      );
      const arrRaw = Array.isArray(r?.data) ? (r.data as any[]) : [];

const arr: StoreFeedbackQuestion[] = arrRaw.map((q: any) => ({
  id: q.id,
  storeId: q.storeId ?? q.store_id,
  title: q.title ?? q.question ?? q.text ?? q.label ?? "",
  type: q.type,
  isActive: q.isActive ?? q.is_active ?? true,
  order: q.order ?? q.order_number ?? 0,
  createdAt: q.createdAt ?? q.created_at,
  updatedAt: q.updatedAt ?? q.updated_at,
}));

setItems(arr.sort(sortByOrder));
    } catch (e: any) {
      setErr(e?.message || "refresh failed");
    } finally {
      setLoading(false);
    }
  }

  // ✅ โหลดครั้งแรก (ให้ชัวร์ว่าดึงล่าสุด)
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setErr(null);

    try {
      await api(`/api/admin/stores/${storeId}/feedback/questions`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          type,
          isActive: true,
          order: nextOrder,
        }),
      });

      setTitle("");
      setType("STAR");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "create failed");
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(it: StoreFeedbackQuestion) {
  setEditItem({
    ...it,
    title: it.title ?? "",
    type: (it.type ?? "STAR") as QuestionType,
    isActive: it.isActive ?? true,
    order: it.order ?? 0,
  });
  setOpenEdit(true);
}

  function closeEditModal() {
    setOpenEdit(false);
    setEditItem(null);
  }

  async function onSaveEdit() {
    if (!editItem) return;
    if (!editItem.title.trim()) return;

    setLoading(true);
    setErr(null);
    try {
      // ✅ สำคัญ: ยิงไป path ที่มีอยู่จริง
      await api(`/api/admin/stores/${storeId}/feedback/questions/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editItem.title.trim(),
          type: editItem.type,
          isActive: editItem.isActive,
        }),
      });

      closeEditModal();
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "update failed");
    } finally {
      setLoading(false);
    }
  }

  function openDeleteModal(it: StoreFeedbackQuestion) {
    setDeleteItem(it);
    setOpenDelete(true);
  }

  function closeDeleteModal() {
    setOpenDelete(false);
    setDeleteItem(null);
  }

  async function onConfirmDelete() {
    if (!deleteItem) return;

    setLoading(true);
    setErr(null);
    try {
      // ✅ สำคัญ: ยิงไป path ที่มีอยู่จริง
      await api(`/api/admin/stores/${storeId}/feedback/questions/${deleteItem.id}`, {
        method: "DELETE",
      });

      closeDeleteModal();
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(it: StoreFeedbackQuestion) {
    setLoading(true);
    setErr(null);
    try {
      // ✅ สำคัญ: ยิงไป path ที่มีอยู่จริง
      await api(`/api/admin/stores/${storeId}/feedback/questions/${it.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !it.isActive }),
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "toggle failed");
    } finally {
      setLoading(false);
    }
  }

  async function move(it: StoreFeedbackQuestion, dir: "up" | "down") {
    const sorted = [...items].sort(sortByOrder);
    const idx = sorted.findIndex((x) => x.id === it.id);
    if (idx < 0) return;

    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];

    const newA = { ...a, order: b.order };
    const newB = { ...b, order: a.order };

    const next = sorted
      .map((x) => (x.id === newA.id ? newA : x.id === newB.id ? newB : x))
      .sort(sortByOrder);

    // optimistic
    setItems(next);

    setLoading(true);
    setErr(null);
    try {
      await api(`/api/admin/stores/${storeId}/feedback/questions/reorder`, {
        method: "PATCH",
        body: JSON.stringify({
          items: next.map((x) => ({ id: x.id, order: x.order })),
        }),
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "reorder failed");
      await refresh(); // rollback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {err}
        </div>
      )}

      {/* create */}
      <div className="rounded-2xl bg-[#1A1A1A] p-5 ring-1 ring-[#D4AF37]/20">
        <h2 className="mb-4 text-lg font-semibold text-[#FFD700]">เพิ่มคำถามใหม่</h2>

        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-7">
            <label className="mb-1 block text-sm text-gray-200">ข้อความคำถาม</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ความสะอาดของร้านเป็นอย่างไร?"
              className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white placeholder:text-gray-400 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30"
              required
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-sm text-gray-200">ประเภท</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-4 py-2.5 text-sm font-semibold text-black hover:from-[#FFCC33] hover:to-[#FFD700] disabled:opacity-60"
            >
              {loading ? "กำลังบันทึก..." : "เพิ่มคำถาม"}
            </button>
          </div>
        </form>

        <p className="mt-3 text-xs text-gray-400">Order ใหม่จะเป็น {nextOrder} (ท้ายสุดอัตโนมัติ)</p>
      </div>

      {/* list */}
      <div className="rounded-2xl bg-[#1A1A1A] p-5 ring-1 ring-[#D4AF37]/20">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#FFD700]">รายการคำถาม ({items.length})</h2>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-xl border border-[#FFD700]/40 px-4 py-2 text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/10 disabled:opacity-60"
          >
            รีเฟรช
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-200">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-3">Order</th>
                <th className="py-3 pr-3">คำถาม</th>
                <th className="py-3 pr-3">ประเภท</th>
                <th className="py-3 pr-3">สถานะ</th>
                <th className="py-3 pr-3 text-right">จัดการ</th>
              </tr>
            </thead>

            <tbody className="text-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    {loading ? "กำลังโหลด..." : "ยังไม่มีคำถาม"}
                  </td>
                </tr>
              ) : (
                [...items].sort(sortByOrder).map((it, idx) => (
                  <tr key={it.id} className="border-b border-white/5">
                    <td className="py-3 pr-3 font-mono text-gray-200">{it.order}</td>

                    <td className="py-3 pr-3">
                      <div className="font-medium text-white">{it.title || "-"}</div>
                      <div className="mt-0.5 text-xs text-gray-400 font-mono">{it.id}</div>
                    </td>

                    <td className="py-3 pr-3">
                      <span className="rounded-full border border-[#D4AF37]/30 bg-[#111] px-2.5 py-1 text-xs text-gray-200">
                        {typeLabel(it.type)}
                      </span>
                    </td>

                    <td className="py-3 pr-3">
                      <button
                        disabled={loading}
                        onClick={() => toggleActive(it)}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold border transition",
                          it.isActive
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                            : "border-gray-400/20 bg-white/5 text-gray-300 hover:bg-white/10",
                          loading ? "opacity-60" : "",
                        ].join(" ")}
                      >
                        {it.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </button>
                    </td>

                    <td className="py-3 pr-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={loading || idx === 0}
                          onClick={() => move(it, "up")}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-40"
                          title="เลื่อนขึ้น"
                        >
                          ↑
                        </button>
                        <button
                          disabled={loading || idx === items.length - 1}
                          onClick={() => move(it, "down")}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-40"
                          title="เลื่อนลง"
                        >
                          ↓
                        </button>

                        <button
                          disabled={loading}
                          onClick={() => openEditModal(it)}
                          className="rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-1.5 text-xs font-semibold text-[#FFD700] hover:bg-[#FFD700]/15 disabled:opacity-40"
                        >
                          แก้ไข
                        </button>

                        <button
                          disabled={loading}
                          onClick={() => openDeleteModal(it)}
                          className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-40"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {openEdit && editItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/10 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#1A1A1A] p-5 ring-1 ring-[#D4AF37]/20">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#FFD700]">แก้ไขคำถาม</h3>
                <p className="mt-1 text-xs text-gray-400 font-mono">{editItem.id}</p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
              >
                ปิด
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm text-gray-200">ข้อความคำถาม</label>
                <input
  value={editItem.title ?? ""}
  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
  className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white placeholder:text-gray-400 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30"
/>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-200">ประเภท</label>
                <select
  value={(editItem.type ?? "STAR") as QuestionType}
  onChange={(e) =>
    setEditItem({ ...editItem, type: e.target.value as QuestionType })
  }
  className="w-full rounded-xl border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30"
>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={!!editItem.isActive}
                  onChange={(e) => setEditItem({ ...editItem, isActive: e.target.checked })}
                />
                เปิดใช้งานคำถามนี้
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeEditModal}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                ยกเลิก
              </button>
              <button
                disabled={loading}
                onClick={onSaveEdit}
                className="rounded-xl bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-4 py-2 text-sm font-semibold text-black hover:from-[#FFCC33] hover:to-[#FFD700] disabled:opacity-60"
              >
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {openDelete && deleteItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/10 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#1A1A1A] p-5 ring-1 ring-red-500/20">
            <h3 className="text-lg font-semibold text-red-200">ยืนยันการลบ</h3>
            <p className="mt-2 text-sm text-gray-200">
              ต้องการลบคำถามนี้ใช่ไหม:
              <span className="ml-2 font-semibold text-white">{deleteItem.title}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400 font-mono">{deleteItem.id}</p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeDeleteModal}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                ยกเลิก
              </button>
              <button
                disabled={loading}
                onClick={onConfirmDelete}
                className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
              >
                {loading ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}