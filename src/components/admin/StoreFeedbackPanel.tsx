// src/components/admin/StoreFeedbackPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900/api").replace(/\/$/, "");

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

type StoreLite = { id: string; name: string };

type FeedbackQuestion = {
  key: string;
  label?: string | null;
  type?: string | null;
  avg?: number | null;
  count?: number | null;
};

type FeedbackStatsResponse = {
  store?: { id: string; name: string; slug?: string | null } | null;
  total_feedback?: number;
  questions?: FeedbackQuestion[];
};

function safeNum(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

async function fetchStoreFeedbackStats(storeId: string): Promise<FeedbackStatsResponse | null> {
  const r = await fetch(
    `${API_BASE}/admin/stores/${encodeURIComponent(storeId)}/feedback/stats`,
    { cache: "no-store", credentials: "include" }
  );
  if (!r.ok) return null;

  const text = await r.text();
  try { return JSON.parse(text); } catch { return null; }
}

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
export function FeedbackQuestionsPanel({ stores }: { stores: StoreLite[] }) {
  const [mode, setMode] = useState<"one" | "all">("one");
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [cache, setCache] = useState<Map<string, FeedbackStatsResponse>>(new Map());

  const storeOptions = useMemo(() => {
    return (stores || [])
      .filter((s) => s?.id)
      .map((s) => ({ id: String(s.id), name: String(s.name || "(ไม่ระบุชื่อ)") }));
  }, [stores]);

  useEffect(() => {
    if (mode === "one") {
      if (!selectedId && storeOptions.length > 0) setSelectedId(storeOptions[0].id);
    }
  }, [mode, selectedId, storeOptions]);

  async function loadOne(id: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (cache.has(id)) return;
      const data = await fetchStoreFeedbackStats(id);
      if (!data) throw new Error("โหลดข้อมูลไม่สำเร็จ");

      setCache((old) => {
        const next = new Map(old);
        next.set(id, data);
        return next;
      });
    } catch (e: any) {
      setErrorMsg(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const ids = storeOptions.map((s) => s.id);
      const need = ids.filter((id) => !cache.has(id));
      if (need.length === 0) return;

      const results = await Promise.all(
        need.map(async (id) => ({ id, data: await fetchStoreFeedbackStats(id) }))
      );

      setCache((old) => {
        const next = new Map(old);
        for (const r of results) if (r.data) next.set(r.id, r.data);
        return next;
      });
    } catch (e: any) {
      setErrorMsg(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "one") {
      if (selectedId) loadOne(selectedId);
    } else {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedId]);

  function renderQuestionsBlock(storeId: string) {
    const data = cache.get(storeId);
    const storeName =
      data?.store?.name ||
      storeOptions.find((x) => x.id === storeId)?.name ||
      "(ไม่ระบุชื่อ)";

    const total = safeNum(data?.total_feedback) ?? 0;
    const questions = Array.isArray(data?.questions) ? data!.questions! : [];
    const sorted = [...questions].sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0));

    return (
      <div key={storeId} className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900">{storeName}</div>
            <div className="text-sm text-slate-500">
              จำนวน feedback ทั้งหมด: <span className="font-semibold text-slate-700">{total}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setCache((old) => {
                const next = new Map(old);
                next.delete(storeId);
                return next;
              });
              loadOne(storeId);
            }}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[.98]"
            disabled={loading}
          >
            รีเฟรช
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {sorted.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
              ยังไม่มีชุดคำถามของร้านนี้
            </div>
          ) : (
            sorted.map((q, idx) => {
              const label = String(q?.label || q?.key || `คำถาม ${idx + 1}`);
              const avg = safeNum(q?.avg);
              const count = safeNum(q?.count);
              const showAvg = avg !== null && count !== null && count > 0;

              return (
                <div key={`${storeId}-${idx}-${q?.key}`} className="rounded-xl border bg-slate-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {idx + 1}. {label}
                    </div>

                    <div className="shrink-0 text-right text-sm text-slate-700">
                      {showAvg ? <div className="font-bold">{avg!.toFixed(2)} / 5</div> : <div className="font-bold">-</div>}
                      <div className="text-xs text-slate-500">ตอบ {Number(count || 0)} ครั้ง</div>
                    </div>
                  </div>

                  {q?.key && q?.label && q.key !== q.label ? (
                    <div className="text-xs text-slate-500">key: {q.key}</div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border bg-white text-slate-900 shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="flex flex-col gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-white md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">ชุดคำถาม Feedback ของแต่ละร้าน</h2>
          <p className="text-sm text-slate-500">เลือกดูทีละร้าน หรือเลือก “ทั้งหมด” เพื่อโหลดครั้งเดียว</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode("one")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${
              mode === "one" ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            เลือกทีละร้าน
          </button>

          <button
            onClick={() => setMode("all")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${
              mode === "all" ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            ทั้งหมด
          </button>

          {mode === "one" ? (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="min-w-[220px] rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            >
              {storeOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => {
                setCache(new Map());
                loadAll();
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[.98]"
              disabled={loading}
            >
              รีเฟรชทั้งหมด
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMsg}
          </div>
        ) : null}

        {loading && cache.size === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            กำลังโหลดข้อมูล...
          </div>
        ) : mode === "one" ? (
          selectedId ? (
            <div className="space-y-4">{renderQuestionsBlock(selectedId)}</div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              ไม่พบร้านสำหรับเลือก
            </div>
          )
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {storeOptions.map((s) => renderQuestionsBlock(s.id))}
          </div>
        )}
      </div>
    </section>
  );
}