"use client";

import Link from "next/link";
import { safeUrl } from "@/lib/safeUrl";
import { useEffect, useMemo, useRef, useState } from "react";

type Store = {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  images?: { image_url: string }[];
  is_featured_home?: boolean | null;
};

type Props = {
  stores: Store[];
  cardWidth?: number; // default 320
  speedSec?: number;  // default 45 (ครึ่งเทป/รอบ) -> เลขมาก = ช้าลง
  gap?: number;       // default 24
};

function firstImage(s: Store) {
  return safeUrl(
    s.cover_image ||
      s.images?.[0]?.image_url ||
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop"
  );
}

export default function FeaturedStrip({
  stores = [],
  cardWidth = 320,
  speedSec = 45,
  gap = 24,
}: Props) {
  if (!stores?.length) return null;

  const base = useMemo(
  () => stores.filter((s) => s?.id && s.is_featured_home === true),
  [stores]
);
  const loop = useMemo(() => [...base, ...base], [base]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const xRef = useRef(0);
  const hoverRef = useRef(false);
  const dragActiveRef = useRef(false);

  const [half, setHalf] = useState(0);
  const [active, setActive] = useState(0);

  // วัดครึ่งเทป
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const ro = new ResizeObserver(() => {
      setHalf(track.scrollWidth / 2);
    });
    ro.observe(track);
    setHalf(track.scrollWidth / 2);

    return () => ro.disconnect();
  }, [loop.length]);

  // auto scroll แบบ rAF (ลื่นเหมือน VideoStrip)
  useEffect(() => {
    const track = trackRef.current;
    if (!track || half === 0) return;

    let raf = 0;
    let last = performance.now();
    const cardSpan = cardWidth + gap;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);

      if (hoverRef.current || dragActiveRef.current) {
        last = t;
        return;
      }

      const dt = (t - last) / 1000;
      last = t;

      const v = half / Math.max(0.01, speedSec); // px/s
      xRef.current -= v * dt;

      if (xRef.current <= -half) xRef.current += half;
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;

      const pos = ((-xRef.current % half) + half) % half;
      const idx = Math.round(pos / cardSpan) % base.length;
      if (idx !== active) setActive(idx);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [half, base.length, cardWidth, gap, speedSec, active]);

  // drag เหมือน VideoStrip
  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track || half === 0) return;

    let startX = 0;
    let startPos = 0;

    const normalize = (x: number) => {
      let nx = x;
      while (nx <= -half) nx += half;
      while (nx > 0) nx -= half;
      return nx;
    };

    const onDown = (e: PointerEvent) => {
      dragActiveRef.current = true;
      hoverRef.current = true;
      startX = e.clientX;
      startPos = xRef.current;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragActiveRef.current) return;
      const dx = e.clientX - startX;
      xRef.current = normalize(startPos + dx);
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;
    };

    const onUp = (e: PointerEvent) => {
      if (!dragActiveRef.current) return;
      dragActiveRef.current = false;
      hoverRef.current = false;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    };

    wrap.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      wrap.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [half]);

  // wheel (trackpad) เหมือน VideoStrip
  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track || half === 0) return;

    let wheelRaf = 0;
    let lastDelta = 0;

    const apply = () => {
      let nx = xRef.current - lastDelta;
      while (nx <= -half) nx += half;
      while (nx > 0) nx -= half;
      xRef.current = nx;
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;
      wheelRaf = 0;
    };

    const onWheel = (e: WheelEvent) => {
      lastDelta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.9;
      hoverRef.current = true;
      if (!wheelRaf) wheelRaf = requestAnimationFrame(apply);

      clearTimeout((onWheel as any)._t);
      (onWheel as any)._t = setTimeout(() => (hoverRef.current = false), 250);
    };

    wrap.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      wrap.removeEventListener("wheel", onWheel);
      if (wheelRaf) cancelAnimationFrame(wheelRaf);
    };
  }, [half]);

  return (
    <div
      ref={wrapRef}
      className="relative select-none overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onPointerEnter={() => (hoverRef.current = true)}
      onPointerLeave={() => (hoverRef.current = false)}
    >
      {/* fades เหมือน video */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0F172A] to-transparent opacity-40 z-0" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0F172A] to-transparent opacity-40 z-0" />

      {/* track */}
      <div
        ref={trackRef}
        className="relative z-10 flex py-3 will-change-transform cursor-grab active:cursor-grabbing"
        style={{ width: "max-content", contain: "content" }}
      >
        {loop.map((s, i) => (
          <Link
            key={`${s.id}-${i}`}
            href={`/store/${encodeURIComponent(String(s.id))}`}
            className="relative shrink-0 overflow-hidden rounded-2xl bg-white/5 backdrop-blur ring-1 ring-white/10 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
          >
            {/* badge left */}
            <div className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/15">
              ⭐ Premium
            </div>

            {/* badge right */}
            <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-1 text-[10px] font-extrabold text-black">
              TopAward
            </div>

            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={firstImage(s)}
                alt={s.name}
                className="h-full w-full object-cover transition duration-300 hover:scale-[1.04]"
                loading="lazy"
                draggable={false}
              />
            </div>

            <div className="p-4">
              <div className="mb-1 line-clamp-1 font-bold text-white">{s.name}</div>
              {s.description && (
                <p className="line-clamp-2 text-sm text-white/80">{s.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* dots แบบ VideoStrip */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {base.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-[#FFD700]" : "w-2.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}