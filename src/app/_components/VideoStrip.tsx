"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type VideoItem = {
  id: string;
  title: string;
  youtube_url: string;
  tiktok_url?: string | null;
  thumbnail_url?: string | null;
};

type Props = {
  videos: VideoItem[];
  cardWidth?: number;   // default 360
  speedSec?: number;    // default 28 (ครึ่งเทป/รอบ)
  gap?: number;         // default 16
};

/* ---------------- Helpers ---------------- */
function extractYouTubeId(url = ""): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    }
  } catch {}
  return null;
}

function extractTikTokVideoId(url = ""): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("tiktok.com")) return null;
    const m = u.pathname.match(/\/video\/(\d+)/);
    return m?.[1] || null;
  } catch {}
  return null;
}

function toTikTokEmbed(url = ""): string | null {
  const id = extractTikTokVideoId(url);
  return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
}

function getYoutubeId(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    return u.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

function withParams(u: string, params: Record<string, string | number | boolean>) {
  try {
    const url = new URL(u);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    return url.toString();
  } catch {
    const join = u.includes("?") ? "&" : "?";
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return `${u}${join}${qs}`;
  }
}

/* ---------------- Component ---------------- */
export default function VideoStrip({
  videos = [],
  cardWidth = 360,
  speedSec = 100,
  gap = 16,
}: Props) {
  if (!videos || videos.length === 0) return null;

  const base = useMemo(
    () =>
      videos.map((v) => {
        const id = getYoutubeId(v.youtube_url || "");
        const tik = toTikTokEmbed(v.tiktok_url || "");
        const fallback = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : undefined;
        return {
          ...v,
          _thumb: v.thumbnail_url || fallback,
          _ytid: id || null,
          _tiktok: tik || null,
        };
      }),
    [videos]
  );

  const loop = useMemo(() => [...base, ...base], [base]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const xRef = useRef(0);
  const hoverRef = useRef(false);
  const dragActiveRef = useRef(false);
  const justDraggedRef = useRef(false);

  const [active, setActive] = useState(0);
  const [playerNonce, setPlayerNonce] = useState(0);
  const [openVideo, setOpenVideo] = useState<any | null>(null);

  // 🔸 แสดงปุ่มเมื่อ iframe โหลดเสร็จ
  const [iframeReady, setIframeReady] = useState(false);

  // คำนวณครึ่งความกว้างของเทป (ไว้ทำ loop)
  const [half, setHalf] = useState(0);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setHalf(track.scrollWidth / 2));
    ro.observe(track);
    setHalf(track.scrollWidth / 2);
    return () => ro.disconnect();
  }, [loop.length]);

  /** Auto-scroll by rAF */
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
      } else {
        const dt = (t - last) / 1000;
        last = t;

        const v = half / Math.max(0.01, speedSec); // px/s
        xRef.current -= v * dt;

        if (xRef.current <= -half) xRef.current += half;
        track.style.transform = `translate3d(${xRef.current}px,0,0)`;
      }

      const pos = ((-xRef.current % half) + half) % half;
      const idx = Math.round(pos / cardSpan) % base.length;
      if (idx !== active) setActive(idx);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base.length, cardWidth, gap, speedSec, active, half]);

  /** Drag (mobile-safe: vertical scroll always works) */
useEffect(() => {
  if (openVideo) return;

  const track = trackRef.current;
  const wrap = wrapRef.current;
  if (!track || !wrap) return;

  const CLICK_DRAG_THRESHOLD = 8;

  let startX = 0;
  let startY = 0;
  let startPos = 0;
  let moved = 0;

  const normalize = (x: number) => {
    let nx = x;
    while (nx <= -half) nx += half;
    while (nx > 0) nx -= half;
    return nx;
  };

  // ---- TOUCH (mobile) ----
  const onTouchStart = (e: TouchEvent) => {
    if (!e.touches || !e.touches[0]) return;

    dragActiveRef.current = false; // ยังไม่เริ่มเลื่อนแถบ
    hoverRef.current = true;

    moved = 0;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startPos = xRef.current;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!e.touches || !e.touches[0]) return;

    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    // ✅ ถ้าลากขึ้น/ลง → ปล่อยให้หน้า scroll ได้
    if (!dragActiveRef.current) {
      if (Math.abs(dy) >= Math.abs(dx)) return;

      // ✅ ถ้าลากซ้าย/ขวาจริง (เกิน threshold) → เริ่มเลื่อนแถบ
      if (Math.abs(dx) < 8) return;
      dragActiveRef.current = true;
    }

    // ✅ กัน default เฉพาะตอน “เลื่อนแนวนอนจริง”
    e.preventDefault();

    moved = Math.max(moved, Math.abs(dx));
    xRef.current = normalize(startPos + dx);
    track.style.transform = `translate3d(${xRef.current}px,0,0)`;
  };

  const onTouchEnd = () => {
    if (dragActiveRef.current) {
      dragActiveRef.current = false;
      hoverRef.current = false;

      if (moved > CLICK_DRAG_THRESHOLD) {
        justDraggedRef.current = true;
        setTimeout(() => (justDraggedRef.current = false), 120);
      }
    } else {
      hoverRef.current = false;
    }
  };

  // ---- MOUSE (desktop) ----
  let mouseDown = false;

  const onMouseDown = (e: MouseEvent) => {
    mouseDown = true;
    dragActiveRef.current = true;
    hoverRef.current = true;
    moved = 0;
    startX = e.clientX;
    startPos = xRef.current;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!mouseDown) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    xRef.current = normalize(startPos + dx);
    track.style.transform = `translate3d(${xRef.current}px,0,0)`;
  };

  const onMouseUp = () => {
    if (!mouseDown) return;
    mouseDown = false;
    dragActiveRef.current = false;
    hoverRef.current = false;

    if (moved > CLICK_DRAG_THRESHOLD) {
      justDraggedRef.current = true;
      setTimeout(() => (justDraggedRef.current = false), 120);
    }
  };

  // ✅ touchmove ต้อง passive: false เพื่อให้ preventDefault ทำงาน
  wrap.addEventListener("touchstart", onTouchStart, { passive: true });
  wrap.addEventListener("touchmove", onTouchMove, { passive: false });
  wrap.addEventListener("touchend", onTouchEnd, { passive: true });
  wrap.addEventListener("touchcancel", onTouchEnd, { passive: true });

  // desktop mouse
  wrap.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  return () => {
    wrap.removeEventListener("touchstart", onTouchStart as any);
    wrap.removeEventListener("touchmove", onTouchMove as any);
    wrap.removeEventListener("touchend", onTouchEnd as any);
    wrap.removeEventListener("touchcancel", onTouchEnd as any);

    wrap.removeEventListener("mousedown", onMouseDown as any);
    window.removeEventListener("mousemove", onMouseMove as any);
    window.removeEventListener("mouseup", onMouseUp as any);
  };
}, [half, openVideo]);

  /** Wheel */
  useEffect(() => {
    if (openVideo) return;

    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    let wheelRaf = 0;
    let lastDelta = 0;

    const apply = () => {
      if (!track || half === 0) return;
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
  }, [half, openVideo]);

  /** Open / Close player */
  const openPlayer = (v: any) => {
    if (justDraggedRef.current) return;
    if (!v?._ytid && !v?._tiktok) return;
    hoverRef.current = true;
    setPlayerNonce((n) => n + 1); // force re-mount tiktok iframe
    setIframeReady(false);        // 🔸 รอโหลดใหม่ทุกครั้ง
    setOpenVideo(v);
  };
  const closePlayer = () => {
    setOpenVideo(null);
    hoverRef.current = false;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePlayer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- Render ---------------- */
  return (
    <div
  ref={wrapRef}
  className="relative mt-12 overflow-hidden rounded-2xl select-none touch-pan-y overscroll-y-contain"
  style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
  onPointerEnter={() => (hoverRef.current = true)}
  onPointerLeave={() => (hoverRef.current = false)}
>
      <h2 className="mb-6 text-2xl font-extrabold lg:text-3xl">วิดีโอ</h2>

      {/* fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0F172A] to-transparent opacity-40 z-0" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0F172A] to-transparent opacity-40 z-0" />

      {/* track */}
      <div
        ref={trackRef}
        className="relative z-10 flex py-3 will-change-transform cursor-grab active:cursor-grabbing"
        style={{ width: "max-content", contain: "content" }}
      >
        {loop.map((v, i) => (
          <button
  type="button"
  data-card="1"
  key={`${v.id}-${i}`}
  onClick={() => openPlayer(v)}
  className="relative aspect-[9/16] sm:aspect-[9/16] md:aspect-video
             max-h-[68vh] md:max-h-[520px]  /* ✅ เพิ่มสองคลาสนี้ */
             shrink-0 overflow-hidden rounded-2xl
             bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,.25)]
             ring-1 ring-white/10 hover:ring-amber-400/40
             transition hover:-translate-y-0.5 focus:outline-none cursor-pointer"
  style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
>
            {v._thumb ? (
              <img
                src={v._thumb}
                alt={v.title}
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gray-200 text-sm text-gray-500">
                ไม่มีภาพตัวอย่าง
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* title chip */}
            <div className="absolute inset-x-3 bottom-3">
              <div className="group/title relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-sm transition">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-400/90 text-black shadow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-semibold text-white drop-shadow-sm">
                      {v.title}
                    </div>
                    <div className="text-[11px] leading-4 text-white/80">คลิกเพื่อเล่น</div>
                  </div>
                </div>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0 opacity-0 transition-opacity group-hover/title:opacity-100" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {base.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-amber-400" : "w-2.5 bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* modal */}
      {openVideo && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
          onClick={closePlayer}                 // คลิกนอก = ปิด
          onWheel={(e) => e.stopPropagation()}  // กัน scroll ทะลุ
        >
          <div
            className="relative z-10 w-[92vw] max-w-[540px] md:max-w-5xl"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            {/* player box: แนวตั้งบนมือถือ, แนวนอนบนจอใหญ่ */}
            <div className="relative mx-auto aspect-[9/16] md:aspect-video w-full overflow-hidden rounded-2xl bg-black transition-opacity duration-300 opacity-100">
              {openVideo._ytid ? (
                <iframe
                  key={`yt-${openVideo._ytid}`}
                  src={`https://www.youtube.com/embed/${openVideo._ytid}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  onLoad={() => setIframeReady(true)}   // ✅ แสดงปุ่มหลังโหลด
                />
              ) : (
                <iframe
                  key={`tk-${openVideo._tiktok}-${playerNonce}`}
                  src={withParams(openVideo._tiktok!, { autoplay: 1, muted: 1 })}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  playsInline
                  referrerPolicy="origin-when-cross-origin"
                  onLoad={() => setIframeReady(true)}   // ✅ แสดงปุ่มหลังโหลด
                />
              )}

              {/* สปินเนอร์เล็กๆ ระหว่างโหลด (ตัวเลือก) */}
              {!iframeReady && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
                </div>
              )}
            </div>

            {/* ปุ่มปิด: ล่างกึ่งกลาง + เคารพ safe-area (โผล่เมื่อ iframe พร้อม) */}
            {iframeReady && (
  <>
    {/* พื้นหลังไล่สีแบบ fixed เต็มจอ ปิดรอยต่อทั้งหมด */}
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[10001] h-24 bg-gradient-to-t from-black/80 to-transparent" />

    {/* ปุ่มแบบ fixed เต็มจอ + safe area */}
    <div
      className="fixed inset-x-0 bottom-3 z-[10002] flex justify-center"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom))" }}
    >
      <button
        onClick={closePlayer}
        aria-label="ปิดวิดีโอ"
        className="
          pointer-events-auto
          flex items-center gap-2
          rounded-full px-5 py-2.5 md:px-6 md:py-3
          bg-red-600 text-white font-semibold
          shadow-[0_10px_30px_rgba(0,0,0,.35)]
          ring-2 ring-white/70 backdrop-blur
          transition hover:bg-red-500 active:scale-95
          focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50
        "
      >
        {/* ไอคอน X */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth={2}
             className="h-5 w-5 md:h-6 md:w-6 -ml-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
        ปิดวิดีโอ
      </button>
    </div>
  </>
)}
          </div>
        </div>
      )}
    </div>
  );
}