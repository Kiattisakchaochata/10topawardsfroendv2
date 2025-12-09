// src/components/admin/StoreFeedbackPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");

type Store = {
  id: string;
  name: string;
  slug: string;
};

type StatsResponse = {
  store: { id: string; name: string; slug: string };
  total_feedback: number;
  avg_food_rating: number;
  avg_service_rating: number;
  recent_feedbacks: {
    id: string;
    food_rating: number;
    service_rating: number;
    comment: string | null;
    source: string;
    created_at: string;
    user?: { id: string; name: string | null; email: string | null } | null;
  }[];
};

export default function StoreFeedbackPanel({ stores }: { stores: Store[] }) {
  const [selectedId, setSelectedId] = useState<string | "">(
    stores[0]?.id ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasStores = stores && stores.length > 0;

  useEffect(() => {
    if (!selectedId) {
      setStats(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE}/admin/stores/${selectedId}/feedback/stats`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          const txt = await res.text();
          if (!cancelled) {
            setError(
              `โหลดสถิติไม่สำเร็จ (${res.status}) ${
                txt || ""
              }`.trim()
            );
            setStats(null);
          }
          return;
        }

        const data: StatsResponse = await res.json();
        if (!cancelled) {
          setStats(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const avgFood = useMemo(
    () => (stats ? Number(stats.avg_food_rating || 0).toFixed(1) : "0.0"),
    [stats]
  );
  const avgService = useMemo(
    () => (stats ? Number(stats.avg_service_rating || 0).toFixed(1) : "0.0"),
    [stats]
  );

  if (!hasStores) {
    return (
      <p className="text-sm text-slate-300">
        ยังไม่มีร้านค้าในระบบ ไม่สามารถแสดงคะแนนความพึงพอใจได้
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* เลือกร้าน */}
      <div>
        <label className="mb-1 block text-sm text-slate-300">
          เลือกร้านสำหรับดูคะแนนความพึงพอใจ
        </label>
        <select
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id} className="text-slate-900">
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* แสดงสถานะโหลด / error / ไม่มีข้อมูล */}
      {loading && (
        <div className="rounded-2xl bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
          กำลังโหลดข้อมูลคะแนนจากลูกค้า...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl bg-rose-900/40 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!loading && !error && stats && stats.total_feedback === 0 && (
        <div className="rounded-2xl bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
          ยังไม่มีลูกค้าให้คะแนนร้านนี้ผ่าน QR Code
        </div>
      )}

      {/* ถ้ามีข้อมูลจริง */}
      {!loading && !error && stats && stats.total_feedback > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">เฉลี่ยรสชาติอาหาร</p>
            <p className="mt-1 text-2xl font-semibold text-amber-300">
              {avgFood}
              <span className="ml-1 text-xs text-slate-300">/ 5</span>
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">เฉลี่ยการบริการ</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">
              {avgService}
              <span className="ml-1 text-xs text-slate-300">/ 5</span>
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">จำนวนการให้คะแนนทั้งหมด</p>
            <p className="mt-1 text-2xl font-semibold text-sky-300">
              {stats.total_feedback}
              <span className="ml-1 text-xs text-slate-300">ครั้ง</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}