// src/app/admin/DashboardClient.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900/api").replace(/\/$/, "");

type Summary = { users: number; categories: number; stores: number; visitors: number };

type Store = {
  id: string;
  name: string;
  category?: { id?: string; name: string } | null;
  category_name?: string | null;
  created_at?: string | null;
  expired_at?: string | null;
  renew_count?: number | null;
};

type VisitorByStore = { store_id: string; store_name: string; count: number };

function addMonths(iso?: string | null, months = 0) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(+d)) return null;
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + months);
  return nd.toISOString();
}
type FeedbackRow = {
  store_id: string;
  store_name: string;
  total_feedback: number;
  avg_score?: number | null; // ✅ จาก API /admin/feedback/summary
};

function displayStoreName(s: Store) {
  return (s.name && s.name.trim()) || "(ไม่ระบุชื่อ)";
}

/* ========================= Premium Modal System =========================
   - ไม่แตะ logic ใดๆ แค่ UI
   - ใช้ portal + backdrop เบลอ
   - แอนิเมชัน scale-in จากจุดคลิกล่าสุด
   - ล็อกสกอร์ลแบบ reference count (กันค้าง)
========================================================================= */

// จำจุดกดล่าสุด เพื่อใช้เป็น transform-origin ให้ความรู้สึกเด้งจากจุดนั้น
let LAST_CLICK: { x: number; y: number } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => (LAST_CLICK = { x: e.clientX, y: e.clientY }),
    { capture: true }
  );
}

// ล็อกสกอร์ลแบบนับจำนวน overlay ที่เปิดอยู่
let SCROLL_LOCKS = 0;
let PREV_OVERFLOW = "";
function lockScroll() {
  if (typeof document === "undefined") return;
  SCROLL_LOCKS += 1;
  if (SCROLL_LOCKS === 1) {
    PREV_OVERFLOW = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}
function unlockScroll() {
  if (typeof document === "undefined") return;
  SCROLL_LOCKS = Math.max(0, SCROLL_LOCKS - 1);
  if (SCROLL_LOCKS === 0) {
    document.body.style.overflow = PREV_OVERFLOW || "";
  }
}

function BaseOverlay({
  children,
  z = 10000,
  role = "dialog",
}: {
  children: React.ReactNode;
  z?: number;
  role?: "dialog" | "status" | "alertdialog";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    lockScroll();
    return () => unlockScroll();
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: z }}
      aria-modal="true"
      role={role}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      {children}
    </div>,
    document.body
  );
}

function ModalShell({
  children,
  width = "max-w-md",
  z = 10000,
}: {
  children: React.ReactNode;
  width?: string;
  z?: number;
}) {
  const origin = LAST_CLICK ? `${LAST_CLICK.x}px ${LAST_CLICK.y}px` : "50% 50%";
  return (
    <BaseOverlay z={z} role="dialog">
      <div
        className={`relative w-full ${width} max-h-[90svh] overflow-auto rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-black/5`}
        style={{ transformOrigin: origin, animation: "modalIn .18s ease-out" }}
      >
        {children}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: .0; transform: scale(.98); }
          to   { opacity: 1;  transform: scale(1); }
        }
      `}</style>
    </BaseOverlay>
  );
}

/* ========================= Component ========================= */

export default function DashboardClient({
  summary,
  visitorsByStore = [],
  stores = [],
  expiredFallback = [],
  feedbackSummary = [],
}: {
  summary: Summary;
  visitorsByStore?: VisitorByStore[];
  stores?: Store[];
  expiredFallback?: [string, string][];
  feedbackSummary?: FeedbackRow[];
}) {
  console.log("DashboardClient feedbackSummary =", feedbackSummary);
  // ====== ของเดิม ======
  const [data, setData] = useState<Store[]>(stores || []);
  const [fallback, setFallback] = useState<Map<string, string>>(
    () => new Map(expiredFallback || [])
  );

  // ====== live visitors จาก client-side (UI เดิม เพิ่มแต่สไตล์) ======
  const [loadingVisitors, setLoadingVisitors] = useState<boolean>(true);
  const [liveVisitorsRows, setLiveVisitorsRows] = useState<VisitorByStore[] | null>(null);
  const [liveVisitorsTotal, setLiveVisitorsTotal] = useState<number | null>(null);

  useEffect(() => {
  (async () => {
    setLoadingVisitors(true);
    try {
      const r = await fetch(`${API_BASE}/visitor/stats`, {
  cache: "no-store",
  credentials: "include",
});
      const text = await r.text();
let d: any = {};
try { d = JSON.parse(text); } catch { d = {}; }
if (!r.ok) throw new Error(d?.message || `Request failed with ${r.status}`);

const rows = Array.isArray(d?.perStore)
  ? d.perStore.map((x: any) => ({
      store_id: String(x?.storeId ?? x?.store_id ?? ""),
      store_name: String(x?.store?.name ?? x?.store_name ?? ""),
      count: Number(x?.total ?? x?.count ?? 0),
    }))
  : [];

const total = Number(d?.totalVisitors ?? d?.total ?? 0) || 0;

setLiveVisitorsRows(rows);
setLiveVisitorsTotal(total);
    } catch {
      setLiveVisitorsRows([]);
      setLiveVisitorsTotal(0);
    } finally {
      setLoadingVisitors(false);
    }
  })();
}, []);

  // sync fallback จาก server-props
  useEffect(() => setFallback(new Map(expiredFallback || [])), [expiredFallback]);

  // ===== modal states =====
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Store | null>(null);
  const [months, setMonths] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // helpers (เดิมทั้งหมด)
  const fmt = (d?: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    return Number.isNaN(+dt) ? "-" : dt.toLocaleDateString("th-TH");
  };

  const getExpire = (s?: Store | null) => {
    if (!s) return null;
    return s.expired_at ?? fallback.get(String(s.id)) ?? null;
  };

  const daysUntilISO = (iso?: string | null) => {
    if (!iso) return null;
    const due = new Date(iso);
    if (Number.isNaN(+due)) return null;
    const now = new Date();
    return Math.ceil((+due - +now) / (1000 * 60 * 60 * 24));
  };

  const daysSince = (d?: string | null) => {
    if (!d) return "-";
    const start = new Date(d);
    if (Number.isNaN(+start)) return "-";
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return `${years > 0 ? `${years} ปี` : "0 ปี"} ${months} เดือน`;
  };

  // กลุ่มร้าน (เดิม)
  const expiredStores = useMemo(() => {
    return (data || []).filter((s) => {
      const iso = getExpire(s);
      const left = daysUntilISO(iso);
      return left !== null && left <= 0;
    });
  }, [data, fallback]);

  const expiringSoon = useMemo(() => {
    return (data || [])
      .map((s) => {
        const iso = getExpire(s);
        return { ...s, left: daysUntilISO(iso) };
      })
      .filter((s) => s.left !== null && (s.left as number) > 0 && (s.left as number) <= 30)
      .sort((a, b) => (a.left as number) - (b.left as number));
  }, [data, fallback]);

  function openRenew(st: Store) {
    setTarget(st);
    setMonths("");
    setErrorMsg(null);
    setOpen(true);
  }

  // ต่ออายุ (เดิม)
  async function renewStore() {
    if (!target || !months || months <= 0) {
      setErrorMsg("กรุณาระบุวันหมดอายุใหม่");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/stores/${target.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ months }),
      });

      const text = await res.text();
      let payload: any = {};
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
      if (!res.ok) throw new Error(payload?.message || `Request failed with ${res.status}`);

      const currentISO = getExpire(target) ?? new Date().toISOString();
      const newISO = addMonths(currentISO, Number(months)) ?? currentISO;

      setData((prev) =>
        prev.map((s) =>
          s.id === target.id
            ? {
                ...s,
                name: (s.name && s.name.trim()) || (target.name && target.name.trim()) || "",
                expired_at: newISO,
                renew_count: (s.renew_count ?? 0) + 1,
              }
            : s
        )
      );

      setFallback((old) => {
        const next = new Map(old);
        next.set(String(target.id), newISO);
        return next;
      });

      setOpen(false);
    } catch (e: any) {
      setErrorMsg(e?.message || "ต่ออายุไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  /* ========================= RENDER ========================= */

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox label="ผู้ใช้งาน" value={summary.users} icon="👤" />
        <StatBox label="หมวดหมู่" value={summary.categories} icon="🗂️" />
        <StatBox label="ร้านทั้งหมด" value={summary.stores} icon="🏪" />
        <StatBox
          label="ผู้เข้าชมทั้งหมด"
          value={liveVisitorsTotal ?? summary.visitors}
          icon="👁️"
        />
      </div>

      {/* ใกล้หมดอายุใน 30 วัน */}
      <SectionBox
        title="ใกล้หมดอายุใน 30 วัน"
        badge={expiringSoon.length ? `${expiringSoon.length} ร้าน` : undefined}
        badgeClass="bg-amber-100 text-amber-700"
      >
        <DataTable className="min-w-[760px]">
          <thead>
            <tr>
              <Th>ชื่อร้าน</Th>
              <Th>หมวดหมู่</Th>
              <Th>วันหมดอายุ</Th>
              <Th>คงเหลือ</Th>
              <Th className="text-center">จัดการ</Th>
            </tr>
          </thead>
          <tbody>
            {expiringSoon.length === 0 ? (
              <NoRow colSpan={5} text="ไม่มีร้านที่ใกล้หมดอายุภายใน 30 วัน" />
            ) : (
              expiringSoon.map((s) => {
                const iso = getExpire(s);
                return (
                  <tr key={s.id} className="border-t hover:bg-slate-50/60">
                    <Td className="text-slate-900">{displayStoreName(s)}</Td>
                    <Td>{s.category_name ?? s.category?.name ?? "-"}</Td>
                    <Td>{fmt(iso)}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        อีก {daysUntilISO(iso)} วัน
                      </span>
                    </Td>
                    <Td className="text-center">
                      <button
                        onClick={() => openRenew(s)}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-emerald-700 active:scale-[.98] transition"
                      >
                        ต่ออายุ
                      </button>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
      </SectionBox>

      {/* ร้านที่หมดอายุแล้ว */}
      <SectionBox
        title="ร้านที่หมดอายุแล้ว"
        badge={expiredStores.length ? `${expiredStores.length} ร้าน` : undefined}
        badgeClass="bg-rose-100 text-rose-700"
      >
        <DataTable className="min-w-[720px]">
          <thead>
            <tr>
              <Th>ชื่อร้าน</Th>
              <Th>หมวดหมู่</Th>
              <Th>วันหมดอายุ</Th>
              <Th className="text-center">จัดการ</Th>
            </tr>
          </thead>
          <tbody>
            {expiredStores.length === 0 ? (
              <NoRow colSpan={4} text="ไม่มีร้านที่หมดอายุ" />
            ) : (
              expiredStores.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50/60">
                  <Td className="text-slate-900">{displayStoreName(s)}</Td>
                  <Td>{s.category_name ?? s.category?.name ?? "-"}</Td>
                  <Td>{fmt(getExpire(s))}</Td>
                  <Td className="text-center">
                    <button
                      onClick={() => openRenew(s)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-emerald-700 active:scale-[.98] transition"
                    >
                      ต่ออายุ
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </SectionBox>

      {/* ความสัมพันธ์กับร้านค้า */}
      <SectionBox title="ข้อมูลความสัมพันธ์กับร้านค้า">
        <DataTable className="min-w[980px]">
          <thead>
            <tr>
              <Th>ชื่อร้าน</Th>
              <Th>วันที่สมัคร</Th>
              <Th>ต่ออายุแล้ว</Th>
              <Th>อยู่กับเรามาแล้ว</Th>
              <Th>หมดอายุ</Th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <NoRow colSpan={5} text="ไม่มีข้อมูลร้านค้า" />
            ) : (
              data.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50/60">
                  <Td className="text-slate-900">{displayStoreName(s)}</Td>
                  <Td>{fmt(s.created_at)}</Td>
                  <Td>{s.renew_count ?? 0} ครั้ง</Td>
                  <Td>{s.created_at ? daysSince(s.created_at) : "-"}</Td>
                  <Td>{fmt(getExpire(s))}</Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </SectionBox>

      {/* ผู้เข้าชมแต่ละร้าน */}
      <SectionBox title="จำนวนผู้เข้าชมแต่ละร้าน">
        <DataTable className="min-w-[760px]">
          <thead>
            <tr>
              <Th>ชื่อร้าน</Th>
              <Th className="text-right">จำนวนผู้เข้าชม</Th>
              <Th>วันหมดอายุ</Th>
            </tr>
          </thead>
          <tbody>
  {(() => {
    // ใช้ live ถ้ามี ไม่งั้น fallback จาก server
    let rows = liveVisitorsRows ?? visitorsByStore;

    // ⬇️ กรองเฉพาะร้านที่ยังมีอยู่จริงใน data (กันเคสถูกลบแล้ว)
    const knownIds = new Set(data.map(s => String(s.id)));
    rows = rows.filter(r => knownIds.has(String(r.store_id)));

    if (loadingVisitors && rows.length === 0) {
      return <NoRow colSpan={3} text="กำลังโหลดข้อมูลผู้เข้าชม..." />;
    }
    if (rows.length === 0) {
      return <NoRow colSpan={3} text="ยังไม่มีข้อมูลผู้เข้าชม" />;
    }

    return rows.map((v, i) => {
      const s = data.find(x => String(x.id) === String(v.store_id));
      const iso = s ? getExpire(s) : null;
      return (
        <tr
          key={String(v.store_id) || `vis-${i}`}
          className="border-t hover:bg-slate-50/60"
        >
          <Td className="text-slate-900">
            {(v.store_name || "").trim() || "(ไม่ระบุชื่อ)"}
          </Td>
          <Td className="text-right">{v.count}</Td>
          <Td>{fmt(iso)}</Td>
        </tr>
      );
    });
  })()}
</tbody>
        </DataTable>
      </SectionBox>

      {/* รายงานการให้คะแนนของแต่ละร้าน */}
      <SectionBox title="รายงานการให้คะแนนของแต่ละร้าน">
        <DataTable className="min-w-[760px]">
          <thead>
  <tr>
    <Th>ชื่อร้าน</Th>
    <Th className="text-right">คะแนนเฉลี่ยรวม</Th>
    <Th className="text-right">จำนวนครั้งที่ให้คะแนน</Th>
  </tr>
</thead>
          <tbody>
            {(!feedbackSummary || feedbackSummary.length === 0) ? (
  <NoRow colSpan={3} text="ยังไม่มีข้อมูลการให้คะแนน" />
) : (
              feedbackSummary.map((f) => (
  <tr key={f.store_id} className="border-t hover:bg-slate-50/60">
    <Td className="text-slate-900">
      {f.store_name || "(ไม่ระบุชื่อ)"}
    </Td>

    <Td className="text-right">
      {Number.isFinite(Number(f.avg_score)) ? Number(f.avg_score).toFixed(2) : "-"} / 5
    </Td>

    <Td className="text-right">
      {Number(f.total_feedback || 0)}
    </Td>
  </tr>
))
            )}
          </tbody>
        </DataTable>
      </SectionBox>
      

      {/* ===== Modal ===== */}
      <RenewModal
        open={open}
        target={target}
        months={months}
        setMonths={setMonths}
        loading={loading}
        errorMsg={errorMsg}
        onClose={() => setOpen(false)}
        onConfirm={renewStore}
      />
    </div>
  );
}

/* ========================= Pretty Building Blocks ========================= */

function SectionBox({
  title,
  children,
  badge,
  badgeClass,
}: {
  title: string;
  children: React.ReactNode;
  badge?: string;
  badgeClass?: string;
}) {
  return (
    <section className="rounded-2xl border bg-white text-slate-900 shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {badge ? (
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium shadow-sm ${badgeClass ?? "bg-slate-100 text-slate-700"}`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DataTable({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>
        {children}
      </table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 bg-slate-50 text-left text-sm font-semibold text-slate-600 ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function NoRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-500">
        {text}
      </td>
    </tr>
  );
}

function StatBox({ label, value, icon }: { label: string; value: number | string; icon?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white text-lg shadow">
          {icon ?? "•"}
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ========================= Premium Renew Modal ========================= */

function RenewModal({
  open,
  target,
  months,
  setMonths,
  loading,
  errorMsg,
  onClose,
  onConfirm,
}: {
  open: boolean;
  target: Store | null;
  months: number | "";
  setMonths: (v: number | "") => void;
  loading: boolean;
  errorMsg: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open || !target) return null;

  return (
    <ModalShell width="max-w-lg" z={12000}>
      <div className="p-6">
        <h3 className="mb-1 text-xl font-bold tracking-tight text-slate-900 text-center">
          ต่ออายุร้าน
        </h3>
        <p className="mb-5 text-center text-sm text-slate-600">
          {displayStoreName(target)}
        </p>

        <label className="block text-sm font-medium mb-1">ระยะเวลา</label>
        <select
          className="mb-3 w-full rounded-lg border px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none"
          value={months}
          onChange={(e) => setMonths(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">เลือกระยะเวลา</option>
          <option value={12}>1 ปี</option>
          <option value={24}>2 ปี</option>
          <option value={36}>3 ปี</option>
          <option value={600}>ตลอดชีวิต</option>
        </select>

        {errorMsg && (
          <p className="mb-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 active:scale-[.98] transition"
            disabled={loading}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !months}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 active:scale-[.98] disabled:opacity-60 transition"
          >
            {loading ? "กำลังต่ออายุ..." : "ต่ออายุ"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}