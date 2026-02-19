"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Store = {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  images?: { id: string; image_url: string; alt_text?: string | null }[];

  // ✅ ร้านพรีเมียม/รายปี
  is_featured_home?: boolean;
};

type Props = {
  store: Store;
  href: string;
  imageUrl: string;
};

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (navigator as any).maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

export default function LatestStoreCard({ store, href, imageUrl }: Props) {
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const [isClamped, setIsClamped] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
  if (!open) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = prev;
  };
}, [open]);
  // tooltip state
  const [showTip, setShowTip] = useState(false);
  const [tipPos, setTipPos] = useState<{
    bottom: number;
    right: number;
    maxH: number;
  }>({
    bottom: 0,
    right: 0,
    maxH: 240,
  });

  const desc = (store.description || "").trim();
  const hasDesc = desc.length > 0;

  // วัดว่าโดนตัด (ellipsis) จริงไหม
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;

    const check = () => {
      const overflow = el.scrollHeight > el.clientHeight + 1;
      setIsClamped(overflow);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [desc]);

  const showInfo = hasDesc && isClamped;

  // ✅ Premium flag
  const isPremium = !!store.is_featured_home;

  // คำนวณตำแหน่ง tooltip (ไว้สำหรับ portal)
  const updateTipPos = () => {
    const b = btnRef.current;
    if (!b) return;

    const r = b.getBoundingClientRect();

    // วาง tooltip "เหนือปุ่ม" เสมอ
    const bottom = window.innerHeight - r.top + 10;
    const right = window.innerWidth - r.right;

    // จำกัดความสูงไม่ให้ล้นจอด้านบน
    const maxH = Math.max(120, Math.floor(r.top - 16));

    setTipPos({ bottom, right, maxH });
  };

  useEffect(() => {
    if (!showTip) return;

    updateTipPos();
    const onScroll = () => updateTipPos();
    const onResize = () => updateTipPos();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [showTip]);

  const onEnter = () => {
    if (!showInfo) return;
    if (isTouchDevice()) return;
    setShowTip(true);
  };

  const onLeave = () => {
    if (isTouchDevice()) return;
    setShowTip(false);
  };

  return (
    <>
      <Link
        href={href}
        className="group block overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-sm transition hover:shadow-lg"
      >
        {/* IMAGE */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={imageUrl}
            alt={store.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            draggable={false}
          />

          {/* ✅ ป้ายพรีเมียม (ย้ายมา “มุมขวาบนของรูป”) */}
          {isPremium && (
            <div className="absolute right-3 top-3 z-10">
              <span
                className="
                  inline-flex items-center
                  rounded-full px-3 py-1
                  text-[11px] font-extrabold
                  bg-red-500/25 text-white
                  ring-1 ring-red-400/50
                  shadow-[0_0_20px_rgba(239,68,68,.35)]
                  backdrop-blur
                "
                title="ร้านพรีเมียม (รายปี)"
              >
                แนะนำ
              </span>
            </div>
          )}
        </div>

        {/* TEXT */}
        <div className="p-4 lg:p-5">
          <h3
            className="truncate text-lg font-extrabold text-white lg:text-xl"
            title={store.name}
          >
            {store.name}
          </h3>

          {hasDesc ? (
            <div className="mt-2 flex items-end gap-2">
              {/* ข้อความ 2 บรรทัด */}
              <p
                ref={descRef}
                className="min-w-0 flex-1 line-clamp-2 text-sm text-white/75 lg:text-base leading-relaxed"
              >
                {desc}
              </p>

              {/* ปุ่ม ! → โชว์เฉพาะตอนโดนตัดจริง */}
              {showInfo && (
                <button
                  ref={btnRef}
                  type="button"
                  onMouseEnter={(e) => {
                    e.preventDefault();
                    onEnter();
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault();
                    onLeave();
                  }}
                  onFocus={() => {
                    if (!isTouchDevice()) setShowTip(true);
                  }}
                  onBlur={() => {
                    if (!isTouchDevice()) setShowTip(false);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(true);
                    setShowTip(false);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-400 text-sm font-extrabold hover:bg-yellow-400/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  aria-label="เอาเมาส์แตะเพื่ออ่าน / แตะเพื่อเปิดเต็ม"
                  title="เอาเมาส์แตะเพื่ออ่าน / แตะเพื่อเปิดเต็ม"
                >
                  !
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/40">ไม่มีคำอธิบายร้าน</p>
          )}
        </div>
      </Link>

      {/* TOOLTIP (Portal ไปที่ body) */}
      {showInfo && showTip && typeof document !== "undefined"
        ? createPortal(
            <div
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              style={{
                position: "fixed",
                right: tipPos.right,
                bottom: tipPos.bottom,
                zIndex: 999999,
                maxHeight: tipPos.maxH,
              }}
              className="
                w-[360px] max-w-[80vw]
                overflow-auto
                rounded-xl bg-black/90 px-3 py-2
                text-[12px] leading-relaxed text-white/95
                ring-1 ring-white/10 shadow-2xl
              "
            >
              {desc}
            </div>,
            document.body
          )
        : null}

      {/* MODAL */}
{open && (
  <div
    className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm"
    onClick={() => setOpen(false)}
  >
    <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
      <div
        className="
          w-[94vw] max-w-xl
          overflow-hidden rounded-2xl
          bg-[#0F172A]
          ring-1 ring-yellow-400/30
          shadow-[0_25px_90px_rgba(0,0,0,.65)]
        "
        style={{ maxHeight: "calc(100dvh - 24px)" }} // ✅ กัน address bar มือถือ
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="line-clamp-1 text-lg font-extrabold text-white">
              {store.name}
            </div>
            <div className="mt-0.5 text-sm text-white/70">รายละเอียดร้าน</div>
          </div>
        </div>

        {/* Body: ✅ scroll ได้ */}
        <div
  className="px-4 py-4 overflow-y-auto overscroll-contain"
  style={{
    maxHeight: "calc(100dvh - 24px - 56px - 72px)",
    WebkitOverflowScrolling: "touch", // ✅ เพิ่มตรงนี้
  }}
>
          <div className="whitespace-pre-wrap text-white/90 leading-relaxed">
            {desc}
          </div>
        </div>

        {/* Footer: ✅ ปุ่มปิดอยู่ล่างสุด + สีเด่น */}
        <div className="border-t border-white/10 bg-[#0B1220]/70 backdrop-blur px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="
              w-full rounded-xl py-3
              bg-gradient-to-r from-[#F9C525] to-[#FFD700]
              text-black font-extrabold
              shadow-lg hover:brightness-110 active:scale-[0.99]
            "
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </>
  );
}