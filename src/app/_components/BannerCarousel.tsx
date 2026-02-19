"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ✅ เพิ่ม helper นี้ (ไม่กระทบส่วนอื่น) เพื่อย่อรูป Cloudinary + แปลงเป็น webp/avif อัตโนมัติ */
function cld(url: string, w: number) {
  if (!url?.includes("/image/upload/")) return url;
  return url.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,c_fill,w_${w}/`
  );
}

type Banner = {
  id: string;
  image_url: string;
  href?: string;
  title?: string | null;
  alt_text?: string | null;
  cta?: string;
  genre?: string;
  subtitle?: string;
};

type Props = {
  banners: Banner[];
  cardWidth?: number; // default 560
  speedSec?: number;  // default 24
  gap?: number;       // default 16
};

export default function BannerCarousel({
  banners = [],
  cardWidth = 560,
  speedSec = 24,
  gap = 16,
}: Props) {
  if (!banners || banners.length === 0) return null;

  const loop = useMemo(() => [...banners, ...banners], [banners]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [cardW, setCardW] = useState(cardWidth);
  const [gapW, setGapW] = useState(gap);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const isMobile = w < 768;

      const nextGap = isMobile ? 14 : gap;

      // ✅ มือถือ: ให้เห็น “การ์ดถัดไป” นิดหน่อย และไม่สูงเกิน
      const mobileTarget = Math.max(260, Math.round(w * 0.88));
      const nextCardW = isMobile ? Math.min(cardWidth, mobileTarget) : cardWidth;

      setCardW(nextCardW);
      setGapW(nextGap);
    });

    ro.observe(wrap);
    return () => ro.disconnect();
  }, [cardWidth, gap]);

  const xRef = useRef(0);
  const hoverRef = useRef(false);
  const velRef = useRef(0);

  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragBaseXRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const lastMoveTRef = useRef(0);

  const [half, setHalf] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setHalf(track.scrollWidth / 2));
    ro.observe(track);
    setHalf(track.scrollWidth / 2);
    return () => ro.disconnect();
  }, [loop.length, cardW, gapW]);

  const normalize = (x: number) => {
    if (half === 0) return x;
    while (x <= -half) x += half;
    while (x > 0) x -= half;
    return x;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || half === 0) return;

    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = (t - last) / 1000;
      last = t;

      if (!hoverRef.current) {
        const vAuto = half / Math.max(0.01, speedSec);
        xRef.current -= vAuto * dt;
      }

      if (!draggingRef.current && Math.abs(velRef.current) > 1) {
        xRef.current += velRef.current * dt;
        velRef.current *= 0.92 ** (dt * 60);
      } else if (draggingRef.current) {
        velRef.current = 0;
      }

      xRef.current = normalize(xRef.current);
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [half, speedSec]);

  const threshold = 5;
  const movedRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    hoverRef.current = true;

    dragStartXRef.current = e.clientX;
    dragBaseXRef.current = xRef.current;
    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = performance.now();
    movedRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;

    const dx = e.clientX - dragStartXRef.current;
    movedRef.current = Math.max(movedRef.current, Math.abs(dx));
    xRef.current = normalize(dragBaseXRef.current + dx);

    const now = performance.now();
    const dt = (now - lastMoveTRef.current) / 1000;
    if (dt > 0) velRef.current = (e.clientX - lastMoveXRef.current) / dt;

    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = now;

    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${xRef.current}px,0,0)`;

    e.preventDefault();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (wrap) {
      try {
        wrap.releasePointerCapture?.(e.pointerId);
      } catch {}
    }
    draggingRef.current = false;

    if (movedRef.current > threshold) {
      let block = true;
      const stopOnce = (ev: any) => {
        if (!block) return;
        ev.stopPropagation();
        ev.preventDefault?.();
      };
      const wrapEl = wrapRef.current;
      if (wrapEl) {
        wrapEl.addEventListener("click", stopOnce, true);
        setTimeout(() => {
          block = false;
          wrapEl.removeEventListener("click", stopOnce, true);
        }, 0);
      }
    }

    setTimeout(() => (hoverRef.current = false), 80);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    draggingRef.current = false;
    hoverRef.current = false;
    try {
      wrapRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={wrapRef}
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-[#0F172A]",
        draggingRef.current ? "cursor-grabbing" : "cursor-grab",
        "select-none touch-pan-y",
        "px-2 sm:px-0",
      ].join(" ")}
      onPointerEnter={() => (hoverRef.current = true)}
      onPointerLeave={() => (hoverRef.current = false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-24 bg-gradient-to-r from-[#0F172A] to-transparent opacity-80" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-24 bg-gradient-to-l from-[#0F172A] to-transparent opacity-80" />

      <div
        ref={trackRef}
        className="flex py-2 sm:py-3 will-change-transform"
        style={{ width: "max-content", contain: "content" }}
      >
        {loop.map((b, i) => {
          const title = (b.title || b.alt_text || "").trim();
          const sub = (b.cta || b.subtitle || "").trim();

          const card = (
            <article
              className={[
                "group relative shrink-0 overflow-hidden rounded-3xl",
                "bg-white/5 ring-1 ring-white/10",
                "shadow-[0_18px_60px_rgba(0,0,0,.45)]",
                "transition-transform duration-300 hover:-translate-y-0.5",
              ].join(" ")}
              style={{ width: `${cardW}px`, marginRight: `${gapW}px` }}
              aria-label={title}
            >
              {/* image */}
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  /* ✅ เปลี่ยนแค่ src ให้ Cloudinary optimize + ตั้ง priority เฉพาะรูปแรก */
                  src={cld(b.image_url, 1000)}
                  alt={b.alt_text || b.title || "banner"}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  draggable={false}
                />

                <div className="mt-2 h-[2px] w-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                {/* badge left */}
                {(b.genre || b.subtitle) && (
                  <div className="absolute left-3 top-3 z-10">
                    <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
                      {b.genre}
                      {b.genre && b.subtitle ? (
                        <span className="px-1 opacity-60">•</span>
                      ) : null}
                      {b.subtitle}
                    </span>
                  </div>
                )}

                {/* ✅ bottom glass bar (อ่านง่ายกว่าเดิม) */}
                {(title || sub) && (
                  <div className="absolute inset-x-3 bottom-3 z-10">
                    <div className="rounded-2xl bg-[#0B1220]/55 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-md">
                      {title && (
                        <div className="line-clamp-1 text-[13px] font-extrabold text-white sm:text-sm">
                          {title}
                        </div>
                      )}
                      {sub && (
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-white/75 sm:text-[12px]">
                          {sub}
                        </div>
                      )}

                      {/* ✅ เปลี่ยนจากทอง → ขาว/เทา (ตามที่บอกไม่เอาเหลืองทอง) */}
                      <div className="mt-2 h-[2px] w-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70" />
                    </div>
                  </div>
                )}
              </div>
            </article>
          );

          return b.href ? (
            <a
              key={`${b.id}-${i}`}
              href={b.href}
              className="focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-3xl"
            >
              {card}
            </a>
          ) : (
            <div key={`${b.id}-${i}`}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}