// src/app/store/[id]/page.tsx
import type React from "react";
import { buildStoreJsonLd } from "@/seo/jsonld";
import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import StoreComments from "@/components/comments/StoreComments";
import VisitPing from "@/components/VisitPing";
import LiveRatingBadge from "@/components/LiveRatingBadge";
import TikTokReload from "@/components/TikTokReload";
import TrackingInjector from "@/app/_components/TrackingInjector";
import { extractIframeSrc } from "@/lib/googleMap";
import { fetchSiteSeo, fetchPageSeoByPath } from "@/seo/fetchers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


/* ---------- types ---------- */
type PageProps = { params: Promise<{ id: string }> };
type MetadataProps = { params: Promise<{ id: string }> };

type ImageObj = { id?: string; image_url: string; alt_text?: string | null };
type Review = { id?: string; rating: number; comment?: string | null; user?: { name?: string } };
type Social = {
  line?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  instagram?: string | null;
  map?: string | null;
};
type Store = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  social_links?: string | null;
  cover_image?: string | null;
  images?: ImageObj[];
  reviews?: Review[];
  is_active?: boolean | number | string | null;
  expired_at?: string | null;
  created_at?: string;
  category?: { id: string | number; name: string; slug?: string | null };
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  website?: string | null;

};
type Video = {
  id: string;
  title?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  thumbnail_url?: string | null;
  tiktok_embed_url?: string | null;
};
type FeedbackQuestion = {
  key: string;
  label: string;
  type: string; // "STAR_1_5", "TEXT", ...
  order_no?: number | null;
};

type FeedbackAnswer = {
  id?: string;
  value_number?: string | number | null;
  value_text?: string | null;
  question: FeedbackQuestion;
};

type StoreFeedback = {
  id?: string;
  comment?: string | null;
  source?: string | null;
  created_at?: string | null;
  answers: FeedbackAnswer[];
};

type StoreFeedbackStats = {
  count: number;
  questions: Array<{
    key: string;
    label: string;
    type: string;
    avg?: number | null;
    count?: number | null;
  }>;
};

/* ---------- consts ---------- */
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || process.env.NEXT_PUBLIC_AUTH_COOKIE || "token";

/* ---------- utils ---------- */
function normalizeJsonLd(input: unknown) {
  if (!input) return null;

  // ถ้าเป็น string ที่เป็น JSON → parse
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      // ถ้าเป็น string แต่ parse ไม่ได้ -> ไม่ฉีดดีกว่า (กันพัง)
      return null;
    }
  }

  // ถ้าเป็น object/array อยู่แล้ว ใช้ได้เลย
  if (typeof input === "object") return input;

  return null;
}

function isSafeStoreId(s: string) {
  return /^[A-Za-z0-9_-]+$/.test(s);
}
function parseSocial(s?: unknown): Social {
  if (!s) return {};
  try {
    const obj: any = typeof s === "string" ? JSON.parse(s) : s;

    return {
      line: obj?.line || obj?.line_url || obj?.lineUrl || undefined,
      facebook: obj?.facebook || obj?.fb || obj?.facebook_url || obj?.facebookUrl || undefined,
      tiktok: obj?.tiktok || obj?.tik_tok || obj?.tiktok_url || obj?.tiktokUrl || undefined,
      instagram: obj?.instagram || obj?.ig || obj?.instagram_url || obj?.instagramUrl || undefined,
      map: obj?.map || obj?.gmap || obj?.googlemap || obj?.google_maps || undefined,
    };
  } catch {
    return {};
  }
}
function tkId(raw: string): string | null {
  try {
    const url = new URL(raw);
    const m1 = raw.match(/\/embed\/v\d\/video\/(\d+)/);
    if (m1?.[1]) return m1[1];
    const m1b = raw.match(/\/embed\/(\d+)/);
    if (m1b?.[1]) return m1b[1];
    const m2 = raw.match(/@[^/]+\/video\/(\d+)/);
    if (m2?.[1]) return m2[1];
    const m3 = raw.match(/\/video\/(\d+)/);
    if (m3?.[1]) return m3[1];
    const m4 = raw.match(/\/v\/(\d+)\.html/);
    if (m4?.[1]) return m4[1];
    const m5 = raw.match(/[?&](?:video_id|videoId)=(\d+)/i);
    if (m5?.[1]) return m5[1];
    if (url.hostname.includes("vt.tiktok.com")) return null;
    return null;
  } catch {
    return null;
  }
}
function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v"); if (v) return v;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    }
    return null;
  } catch { return null; }
}
function tkEmbedUrl(input: string): string | null {
  const id = tkId(input);
  // ✅ รูปแบบ v2 ที่ถูกต้อง: https://www.tiktok.com/embed/v2/<video_id>
  return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
}
function normalizeActive(v: Store["is_active"]): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(s)) return false;
    if (["true", "1", "yes", "on"].includes(s)) return true;
  }
  return true;
}
function isExpired(expired_at?: string | null): boolean {
  if (!expired_at) return false;
  const t = new Date(expired_at).getTime();
  return Number.isFinite(t) && t <= Date.now();
}
function isStoreEnabledPublic(s?: Store | null): boolean {
  if (!s) return false;
  return normalizeActive(s.is_active) && !isExpired(s.expired_at);
}
function buildDirectionsUrl(
  raw?: string,
  address?: string | null,
  name?: string | null
) {
  // ถ้าเป็น <iframe ...> ให้ดึง src ออกมาก่อน
  if (raw && /<iframe/i.test(raw)) {
    const m = raw.match(/src=["']([^"']+)["']/i);
    raw = m?.[1] || "";
  }

  const qFallback = (address?.trim() || name?.trim() || "").trim();

  try {
    if (raw) {
      const u = new URL(raw);

      // maps.app.goo.gl หรือ goo.gl -> ปล่อยเป็น destination เดิมได้เลย
      if (u.hostname.includes("maps.app") || u.hostname.includes("goo.gl")) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(raw)}`;
      }

      // ดึงพิกัดจาก @lat,lng,zoom ใน URL
      const mCoord = raw.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (mCoord) {
        const lat = mCoord[1], lng = mCoord[2];
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      }

      // ดึงชื่อสถานที่จาก /maps/place/<name>
      const mPlace = u.pathname.match(/\/maps\/place\/([^/]+)/);
      if (mPlace?.[1]) {
        const place = decodeURIComponent(mPlace[1].replace(/\+/g, " "));
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
      }

      // ใช้พารามิเตอร์ q=... ถ้ามี
      const q = u.searchParams.get("q");
      if (q) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
      }
    }
  } catch {
    /* no-op */
  }

  // fallback สุดท้าย ใช้ address หรือ name
  if (qFallback) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(qFallback)}`;
  }

  // ถ้าไม่มีอะไรจริง ๆ ก็คืน raw (เปิดได้แต่ไม่ใช่โหมดนำทาง)
  return raw || "";
}
function toMapsViewUrl(u: string) {
  // แปลง embed → view เพื่อใช้เปิดแท็บใหม่
  try {
    const url = new URL(u);
    if (url.pathname.includes("/maps/embed")) {
      url.pathname = url.pathname.replace("/maps/embed", "/maps");
    }
    if (url.searchParams.get("output") === "embed") {
      url.searchParams.delete("output");
    }
    return url.toString();
  } catch {
    return u;
  }
}
/** สร้าง src ของ iframe Google Maps */
function buildMapsEmbedUrl(
  raw?: string | null,
  address?: string | null,
  name?: string | null
) {
  if (raw && /<iframe/i.test(raw)) {
    const m = raw.match(/src=["']([^"']+)["']/i);
    raw = m?.[1] || "";
  }
  if (!raw && !address && !name) return null;

  try {
    if (raw) {
      const u = new URL(raw);
      const hostIsGoogle =
        /(^|\.)google\.(com|co\.\w+)$/i.test(u.hostname) || u.hostname === "maps.google.com";
      const path = u.pathname || "";

      if (hostIsGoogle && (path.includes("/maps/embed") || path.includes("/embed"))) {
        return raw;
      }
      if (hostIsGoogle && path.includes("/maps/d/")) {
        const mid = u.searchParams.get("mid");
        if (mid) {
          const ps = new URLSearchParams({ mid });
          const ll = u.searchParams.get("ll"); if (ll) ps.set("ll", ll);
          const z = u.searchParams.get("z"); if (z) ps.set("z", z);
          return `https://www.google.com/maps/d/embed?${ps.toString()}`;
        }
      }

      // ⭐ ถ้าเป็นลิงก์สั้น maps.app / goo.gl
      if (u.hostname.includes("maps.app") || u.hostname.includes("goo.gl")) {
        const q = (address?.trim() || name?.trim() || "").trim();
        if (q) return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}&z=16`;
        return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(raw)}&z=3`;
      }

      const qParam = u.searchParams.get("q");
      if (qParam) {
        return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(qParam)}&z=16`;
      }
      const mPlace = path.match(/\/maps\/place\/([^/]+)/);
      if (mPlace?.[1]) {
        const place = decodeURIComponent(mPlace[1].replace(/\+/g, " "));
        return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(place)}&z=16`;
      }
      const mCoord = raw.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+(?:\.\d+)?)z/);
      if (mCoord) {
        const lat = mCoord[1], lng = mCoord[2], z = Math.round(Number(mCoord[3]) || 15);
        return `https://www.google.com/maps?output=embed&ll=${lat},${lng}&z=${z}`;
      }

      if (hostIsGoogle) {
        const q = address?.trim() || name?.trim();
        if (q) return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}&z=16`;
      }
    }
  } catch { }
  const q = address?.trim() || name?.trim();
  return q ? `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}&z=16` : null;
}

// ✅ helper แปลง keyword string → string[]
function toKeywordArray(kw?: string | null): string[] | undefined {
  if (!kw || !kw.trim()) return undefined;
  return kw.split(",").map((s) => s.trim()).filter(Boolean);
}
function buildPostalAddress(raw?: string | null, province?: string | null) {
  const addr = (raw || "").trim();
  if (!addr && !province) return undefined;

  // ดึง locality แบบง่าย ๆ จาก address (ถ้ามีคำว่า อำเภอ/เขต/ตำบล/แขวง)
  const pick = (re: RegExp) => {
    const m = addr.match(re);
    return m?.[1]?.trim() || undefined;
  };

  const locality =
    pick(/อำเภอ\s*([^\s,]+)/) ||
    pick(/เขต\s*([^\s,]+)/) ||
    pick(/ตำบล\s*([^\s,]+)/) ||
    pick(/แขวง\s*([^\s,]+)/);

  return {
    "@type": "PostalAddress",
    streetAddress: addr || undefined,
    addressLocality: locality,
    addressRegion: province || undefined,
    addressCountry: "TH",
  };
}

/* ---------- data loaders ---------- */
async function getStore(id: string): Promise<Store | null> {
  try {
    const res = await fetch(`${API_URL}/stores/${encodeURIComponent(id)}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.store || data) as Store;
  } catch {
    return null;
  }
}
async function getMe() {
  try {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `${AUTH_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
async function getStoreVideos(storeId: string): Promise<Video[]> {
  const tryUrls = [
    `${API_URL}/videos?store_id=${encodeURIComponent(storeId)}&active=1`,
    `${API_URL}/videos?store=${encodeURIComponent(storeId)}&active=1`,
    `${API_URL}/stores/${encodeURIComponent(storeId)}/videos`,
  ];
  for (const url of tryUrls) {
    try {
      const r = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        next: { revalidate: 0 },
      });
      if (!r.ok) continue;

      const j = await r.json();
      const list =
        (Array.isArray(j) && j) ||
        (Array.isArray(j?.videos) && j.videos) ||
        (Array.isArray(j?.data) && j.data) ||
        (Array.isArray(j?.rows) && j.rows) ||
        null;

      if (Array.isArray(list)) {
        const raw = list as Video[];
        const enriched = raw.map((v) => ({
          ...v,
          tiktok_embed_url: v.tiktok_url ? tkEmbedUrl(v.tiktok_url) : null,
        }));
        return enriched.filter((v) => v.youtube_url || v.tiktok_embed_url);
      }
    } catch { }
  }
  return [];
}
async function getReviewStats(storeId: string): Promise<{ avg?: number; count: number }> {
  try {
    const r = await fetch(`${API_URL}/reviews/stores/${encodeURIComponent(storeId)}/reviews`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      next: { revalidate: 0 },
    });
    const j = await r.json().catch(() => ({}));
    const reviews: Array<{ rating?: number }> =
      (Array.isArray(j?.reviews) && j.reviews) || (Array.isArray(j) && j) || [];
    const nums = reviews.map((x) => Number(x?.rating || 0)).filter((n) => Number.isFinite(n) && n > 0);
    const count = nums.length;
    const avg = count ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(1)) : undefined;
    return { avg, count };
  } catch {
    return { avg: undefined, count: 0 };
  }
}
async function getFeedbackStats(storeId: string): Promise<StoreFeedbackStats> {
  try {
    const r = await fetch(
      `${API_URL}/public/stores/${encodeURIComponent(storeId)}/feedback/stats`,
      {
        cache: "no-store",
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        next: { revalidate: 0 },
      }
    );

    const j = await r.json().catch(() => ({}));
    return {
      count: Number(j?.count || 0),
      questions: Array.isArray(j?.questions) ? j.questions : [],
    };
  } catch {
    return { count: 0, questions: [] };
  }
}

// ✅ โหลด feedback list (จาก QR)
async function getFeedbackList(storeId: string): Promise<StoreFeedback[]> {
  try {
    const r = await fetch(
      `${API_URL}/public/stores/${encodeURIComponent(storeId)}/feedback?take=20`,
      {
        cache: "no-store",
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        next: { revalidate: 0 },
      }
    );

    const j = await r.json().catch(() => ({}));
    const rows = (Array.isArray(j?.data) && j.data) || (Array.isArray(j) && j) || [];

    // ✅ กันพัง + sort ตาม order_no
    return (rows as any[]).map((item) => ({
      id: item?.id,
      comment: item?.comment ?? null,
      source: item?.source ?? null,
      created_at: item?.created_at ?? null,
      answers: Array.isArray(item?.answers)
        ? item.answers
            .slice()
            .sort(
              (a: any, b: any) =>
                Number(a?.question?.order_no ?? 999) - Number(b?.question?.order_no ?? 999)
            )
        : [],
    })) as StoreFeedback[];
  } catch {
    return [];
  }
}

/* ---------- SEO ---------- */
export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { id: raw } = await params;
  const id = decodeURIComponent(String(raw || ""));


  if (!isSafeStoreId(id)) {
    return {
      title: "ไม่พบร้าน | TopAward",
      description: "ลิงก์ไม่ถูกต้อง",
      robots: { index: false, follow: false },
      alternates: { canonical: "/" },
    };
  }

  const pathExact = `/store/${id}`;
  const pathTemplate = `/store/[id]`;

  const [store, siteSeo, pageSeoExact, pageSeoTpl] = await Promise.all([
    getStore(id),
    fetchSiteSeo(),
    fetchPageSeoByPath(pathExact),
    fetchPageSeoByPath(pathTemplate),
  ]);

  const pageSeo = pageSeoExact || pageSeoTpl;

  if (!store || !isStoreEnabledPublic(store)) {
    return {
      title: "ไม่พบร้าน | TopAward",
      description: "ไม่พบหน้าร้านหรือร้านถูกปิดใช้งาน",
      robots: { index: false, follow: false },
      alternates: { canonical: "/" },
    };
  }

  const seoTitle = (pageSeo as any)?.title || null;
  const seoDesc = (pageSeo as any)?.description || null;
  const seoOg = (pageSeo as any)?.og_image || null;

  const seoKw =
    (pageSeo as any)?.keywords ??
    (siteSeo as any)?.keywords ??
    null;

  const title = seoTitle || `${store.name} | TopAward`;
  const description =
    seoDesc ||
    store.description?.slice(0, 155) ||
    `รายละเอียดร้าน ${store.name} บน TopAward`;

  const url = `${SITE_URL}/store/${store.id}`;
  const ogImage = seoOg || store.cover_image || store.images?.[0]?.image_url || undefined;
  const keywords = toKeywordArray(seoKw);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    keywords,
  };
}

/* ---------- small UI ---------- */
function StarGradient({ className = "" }: { className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent ${className}`} aria-hidden>
      ★
    </span>
  );
}
function StarRow({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span className={`inline-flex items-center gap-0.5 leading-none ${className}`} aria-label={`${v} ดาว`}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < v ? (
          <StarGradient key={i} className="text-base" />
        ) : (
          <span key={i} className="text-white/25" aria-hidden>
            ★
          </span>
        )
      )}
    </span>
  );
}
/* ---------- Page ---------- */
export default async function StoreDetailPage({ params }: PageProps) {
  const { id: raw } = await params;
  const id = decodeURIComponent(String(raw || ""));
  if (!isSafeStoreId(id)) notFound();

  const pathExact = `/store/${id}`;
  const pathTemplate = `/store/[id]`;

  const [store, me, videos, stats, fbStats, fbList, pageSeoExact, pageSeoTpl] = await Promise.all([
  getStore(id),
  getMe(),
  getStoreVideos(id),
  getReviewStats(id),
  getFeedbackStats(id),
  getFeedbackList(id),
  fetchPageSeoByPath(pathExact),
  fetchPageSeoByPath(pathTemplate),
]);

  const pageSeo = pageSeoExact || pageSeoTpl;
  const apiJsonLd = normalizeJsonLd((pageSeo as any)?.jsonld);

  if (!store || !isStoreEnabledPublic(store)) notFound();

  const ratingCount = stats.count;
  const ratingAvg = stats.avg;

  const images = [store.cover_image, ...(store.images?.map((i) => i.image_url) || [])].filter(Boolean) as string[];
  const social = parseSocial(store.social_links);
  const loggedIn = Boolean(me?.id);
  const currentUserId = me?.id ?? null;

  // วิดีโอ fallback
  const fallbackSingle: Video[] = [];
  if (!videos.length) {
    const yt = (store as any)?.youtube_url || "";
    const tk = (store as any)?.tiktok_url || "";
    if (yt || tk) {
      fallbackSingle.push({
        id: `store-single-${store.id}`,
        title: store.name || "Video",
        youtube_url: yt || null,
        tiktok_url: tk || null,
        tiktok_embed_url: tk ? tkEmbedUrl(tk) : null,
        thumbnail_url: (store as any)?.thumbnail_url || null,
      });
    }
  }
  const videosToShow = videos.length ? videos : fallbackSingle;

  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าหลัก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "หมวดหมู่", item: `${SITE_URL}/category` },
      ...(store.category?.id
        ? [{ "@type": "ListItem", position: 3, name: store.category.name, item: `${SITE_URL}/category/${store.category.id}` }]
        : []),
      { "@type": "ListItem", position: store.category?.id ? 4 : 3, name: store.name, item: `${SITE_URL}/store/${store.id}` },
    ],
  };
  const ldLocalBusiness = buildStoreJsonLd({
    id: store.id,
    name: store.name,

    // slug ถ้าไม่มีใน store ก็ไม่ต้องส่ง
    // slug: (store as any).slug,

    description: store.description || undefined,
    address: store.address || undefined,

    phone: store.phone ?? null,
    email: null,
    website: store.website ?? null,

    latitude: store.latitude ?? null,
    longitude: store.longitude ?? null,

    cover_image:
      store.cover_image ||
      (store.images?.[0]?.image_url ?? null),

    // ให้ jsonld.ts เดาจาก category ได้
    category_raw_slug: store.category?.slug ?? null,
    category_name: store.category?.name ?? null,

    social_links: {
      facebook: social.facebook || "",
      line: social.line || "",
      instagram: social.instagram || "",
      tiktok: social.tiktok || "",
      map: social.map || "",
    },

    avg_rating: ratingAvg,
    review_count: ratingCount,
  });

  return (
    <>
      {/* Tracking & LD */}
      <TrackingInjector storeId={id} />
      <TikTokReload storeId={store.id} />

      {/* ✅ JSON-LD จากระบบ SEO (Admin Page SEO) ตาม path /store/[id] */}
      <Script
        id="ld-breadcrumb-store"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb, null, 2) }}
      />

      {apiJsonLd ? (
        <Script
          id="ld-from-admin"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(apiJsonLd, null, 2) }}
        />
      ) : (
        <Script
          id="ld-localbusiness-store"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldLocalBusiness, null, 2) }}
        />
      )}

      {/* BG + content */}
      <div className="relative">
        <VisitPing kind="store" storeId={store.id} />
        {/* ✅ Floating buttons (Home ซ้าย / Back ขวา) */}
        <>
          {/* Home (ซ้าย) */}
          <Link
            href="/"
            className="
    fixed left-4 bottom-5 z-[9998]
    grid h-12 w-12 place-items-center rounded-full
    bg-[#F9C525] text-white shadow-lg
    ring-2 ring-white/80
    opacity-65 blur-[0.6px] transition
    hover:opacity-100 hover:blur-0 hover:scale-105
    active:scale-95
  "
            aria-label="กลับหน้า Home"
            title="Home"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z"
                fill="currentColor"
              />
            </svg>
          </Link>

          {/* Back (ขวา) */}
          <button
            type="button"
            data-action="back"
            className="
    fixed right-4 bottom-5 z-[9998]
    flex flex-col items-center justify-center gap-0.5
    h-14 w-14 rounded-full

    bg-[#F9C525] text-black
    shadow-lg

    /* state ปกติ */
    opacity-40
    blur-[0.6px]

    /* transition */
    transition-all duration-200 ease-out

    /* hover */
    hover:opacity-100
    hover:blur-0
    hover:scale-105
    hover:shadow-xl

    active:scale-95
    cursor-pointer
  "
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
          >
            {/* Arrow */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 12h9a6 6 0 1 1 0 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>

            {/* Label */}
            <span className="text-[10px] font-bold leading-none">
              ย้อนกลับ
            </span>
          </button>
        </>

        {/* ✅ Back handler (history.back) */}
        <Script
          id="floating-back-handler"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  // ✅ กัน bind ซ้ำเวลา hot reload / route change
  if (window.__TA_BACK_BOUND__) return;
  window.__TA_BACK_BOUND__ = true;

  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest && e.target.closest('[data-action="back"]');
    if (!t) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      // ถ้าย้อน history ได้ → back
      if (history.length > 1) history.back();
      // ถ้าไม่มี history → ไปหมวดหมู่เป็น fallback
      else location.href = '/category';
    } catch(_) {
      location.href = '/category';
    }
  }, true);
})();
`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.08), transparent 55%), radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.07), transparent 50%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 lg:py-8">
          {/* breadcrumb */}
          <nav className="text-sm text-slate-300/90">
            <Link href="/" className="hover:underline">หน้าหลัก</Link>
            <span className="mx-2 opacity-60">/</span>
            <Link href="/category" className="hover:underline">หมวดหมู่</Link>
            {store.category?.id && (
              <>
                <span className="mx-2 opacity-60">/</span>
                <Link href={`/category/${store.category.id}`} className="hover:underline">{store.category.name}</Link>
              </>
            )}
            <span className="mx-2 opacity-60">/</span>
            <span className="text-white">{store.name}</span>
          </nav>

          {/* Title + rating */}
          <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{store.name}</h1>
            <div className="flex items-center gap-3">
              <LiveRatingBadge
                key={store.id}
                storeId={store.id}
                apiBase={API_URL}
                initialAvg={ratingAvg}
                initialCount={ratingCount}
              />
            </div>
          </header>

          {/* Tabs */}
          <div className="mt-5 border-y border-white/10 bg-transparent">
            <div className="flex gap-2 overflow-auto px-1 py-2">
              <a href="#overview" className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15">ภาพรวม</a>
              <a href="#videos" className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15">วิดีโอ</a>
              <a href="#reviews" className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15">รีวิว</a>
              <a href="#feedback" className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15">
                Feedback
              </a>
            </div>
          </div>

          {/* Layout */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
            {/* Left */}
            <div className="space-y-6">
              {/* Gallery */}
              <section id="overview" className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[3fr_1fr]">
                  <button type="button" className="group overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20" data-lb-open data-index="0">
                    <img src={images[0] || "/no-image.jpg"} alt={store.name} className="h-[220px] w-full object-cover transition duration-500 md:h-[750px] group-hover:scale-[1.02]" />
                  </button>
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-1">
                    {images.slice(1, 6).map((src, i) => (
                      <button
                        type="button"
                        key={src + i}
                        className="relative overflow-hidden rounded-lg ring-1 ring-white/10 bg-black/20"
                        data-lb-open
                        data-index={i + 1}
                        aria-label={`เปิดภาพที่ ${i + 2}`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </button>
                    ))}
                    {images.length <= 1 && (
                      <div className="grid aspect-[4/3] place-items-center rounded-lg ring-1 ring-white/10 text-slate-300">
                        ไม่มีรูปเพิ่มเติม
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Description */}
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
                <h2 className="mb-2 text-xl font-bold text-white">รายละเอียด</h2>
                <p className="text-slate-200/85">{store.description || "ไม่มีรายละเอียด"}</p>
              </section>

              {/* Reviews */}
              <section id="reviews" className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
                <StoreComments
                  storeId={store.id}
                  apiBase={API_URL}
                  loggedIn={loggedIn}
                  currentUserId={currentUserId}
                />
              </section>
              {/* ✅ Feedback (QR) */}
<section id="feedback" className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-xl font-bold text-white">Feedback จาก QR</h2>
      <p className="text-sm text-white/70">ทั้งหมด {fbStats?.count || 0} รายการ</p>
    </div>
  </div>

  {/* ✅ Summary ต่อคำถาม (จาก stats.questions) */}
  {!!fbStats?.questions?.length && (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {fbStats.questions
        .slice()
        .sort((a, b) => (a?.count || 0) === (b?.count || 0) ? 0 : (b.count - a.count))
        .map((q) => (
          <div key={q.key} className="rounded-xl bg-black/20 p-3 ring-1 ring-white/10">
            <div className="text-sm font-medium text-white/85">{q.label}</div>

            {q.type === "STAR_1_5" ? (
              <div className="mt-1 flex items-center gap-2">
                <StarRow value={Number(q.avg || 0)} />
                <span className="text-xs text-white/55">
                  เฉลี่ย {Number(q.avg || 0).toFixed(1)} • {q.count} ครั้ง
                </span>
              </div>
            ) : (
              <div className="mt-1 text-xs text-white/55">
                เฉลี่ย {q.avg != null ? Number(q.avg).toFixed(1) : "-"} • {q.count} ครั้ง
              </div>
            )}
          </div>
        ))}
    </div>
  )}

  {/* ✅ รายการ feedback */}
  <div className="mt-4 space-y-3">
    {!fbList?.length ? (
      <p className="text-sm text-slate-300">ยังไม่มี feedback</p>
    ) : (
      fbList.map((f, idx) => {
        const answers = (f.answers || [])
          .slice()
          .sort((a, b) => (a.question.order_no ?? 999) - (b.question.order_no ?? 999));

        return (
          <div key={(f.id || "fb") + idx} className="rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{f.source || "QR"}</span>

              {f.created_at && (
                <span className="ml-auto text-xs text-white/50">
                  {new Date(f.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
            </div>

            {/* answers ตามคำถามจริง */}
            {!!answers.length && (
              <div className="mt-3 grid gap-2">
                {answers.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"
                  >
                    <div className="text-sm text-white/85">{a.question.label}</div>

                    {a.question.type === "STAR_1_5" ? (
                      <StarRow value={Number(a.value_number || 0)} />
                    ) : (
                      <div className="text-sm text-white/80">{a.value_text ?? a.value_number ?? "-"}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* comment */}
            <div className="mt-3">
              {f.comment ? (
                <p className="text-[15px] leading-6 text-white/85 whitespace-pre-line">{f.comment}</p>
              ) : (
                <p className="text-sm text-white/50">ไม่มีคอมเมนต์</p>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>
</section>
            </div>

            {/* Right */}
            <aside className="h-max space-y-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-[#D4AF37]/25 bg-white/5 p-4 text-white shadow backdrop-blur">
                <h3 className="text-lg font-bold">ข้อมูลร้าน</h3>
                <dl className="mt-3 space-y-2 text-[15px]">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-white/60">ที่อยู่</dt>
                    <dd className="flex-1">{store.address || <span>-</span>}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-white/60">โซเชียล</dt>
                    <dd className="flex-1">
                      {(() => {
                        const chips: React.ReactNode[] = [];
                        if (social.line)
                          chips.push(
                            <a
                              key="line"
                              href={social.line}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#06C755]/90 px-3 py-1.5 text-sm font-semibold text-black hover:brightness-110"
                            >
                              <span>LINE</span>
                            </a>
                          );
                        if (social.facebook)
                          chips.push(
                            <a
                              key="facebook"
                              href={social.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2]/90 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                            >
                              <span>Facebook</span>
                            </a>
                          );
                        if (social.tiktok)
                          chips.push(
                            <a
                              key="tiktok"
                              href={social.tiktok}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15"
                            >
                              <span>🎵 TikTok</span>
                            </a>
                          );
                        if (social.instagram)
                          chips.push(
                            <a
                              key="instagram"
                              href={social.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                            >
                              <span>📸 Instagram</span>
                            </a>
                          );
                        return chips.length ? (
                          <div className="flex flex-wrap gap-2">{chips}</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-white/50">-</span>
                          </div>
                        );
                      })()}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-white/60">อัปเดต</dt>
                    <dd className="flex-1">
                      {store.created_at
                        ? new Date(store.created_at).toLocaleDateString("th-TH")
                        : <span>-</span>}
                    </dd>
                  </div>
                </dl>

                {/* Map */}
                {(() => {
                  const rawMap = social.map || undefined;
                  // ถ้าเป็น <iframe ...> ดึง src; ถ้าเป็นลิงก์ปกติ (เช่น https://maps.app.goo.gl/...) ใช้ตามนั้นเลย
                  const mapHref = rawMap
                    ? (/<iframe/i.test(rawMap) ? (extractIframeSrc(rawMap) || "") : rawMap)
                    : undefined;

                  const mapEmbed = buildMapsEmbedUrl(mapHref, store.address, store.name);
                  return (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-white/90">แผนที่</h4>
                        {mapHref && (
                          <a
                            href={buildDirectionsUrl(mapHref, store.address, store.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-yellow-500 hover:bg-white/15 ring-1 ring-white/15"
                          >
                            เปิดนำทางใน Google Maps
                          </a>
                        )}
                      </div>

                      {mapEmbed ? (
                        <div className="overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20">
                          <div className="aspect-[16/9] w-full">
                            <iframe
                              src={mapEmbed}
                              className="h-full w-full"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              allowFullScreen
                              title="Google Maps"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-300/80">ยังไม่มีแผนที่</p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Videos */}
              <section
                id="videos"
                key={`videos-${store.id}-${videosToShow.length}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <h4 className="px-1 pb-3 text-white/90">วิดีโอของร้าน</h4>
                {videosToShow.length === 0 ? (
                  <p className="px-1 pb-2 text-slate-300">ยังไม่มีวิดีโอ</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-4">
                    {videosToShow.map((v) => {
                      if (v.youtube_url) {
                        const id = ytId(v.youtube_url);
                        if (!id) return null;
                        if (v.tiktok_url && !v.tiktok_embed_url) {
                          return (
                            <li
                              key={`tk-${v.id}`}
                              className="rounded-xl ring-1 ring-white/10 bg-black/20 p-3 text-sm text-slate-300"
                            >
                              ไม่สามารถฝังวิดีโอ TikTok ได้: ลิงก์นี้ไม่ใช่วิดีโอ หรือเป็นลิงก์สั้น vt.tiktok.com
                            </li>
                          );
                        }
                        return (
                          <li
                            key={`yt-${v.id}`}
                            className="overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20"
                          >
                            <div className="aspect-[16/9] w-full">
                              <iframe
                                className="h-full w-full"
                                src={`https://www.youtube.com/embed/${id}?autoplay=0`}
                                title={v.title || "YouTube video"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                            {v.title && (
                              <div className="p-3 text-xs text-white/85 line-clamp-2">
                                {v.title}
                              </div>
                            )}
                          </li>
                        );
                      }
                      if (v.tiktok_url) {
                        // ใช้ URL ที่คำนวณไว้แล้วจาก getStoreVideos()
                        const src =
                          (v.tiktok_embed_url || tkEmbedUrl(v.tiktok_url)) ?? null;
                        if (!src) {
                          return (
                            <li
                              key={`tk-${v.id}`}
                              className="rounded-xl ring-1 ring-white/10 bg-black/20 p-3 text-sm text-slate-300"
                            >
                              ไม่สามารถฝังวิดีโอ TikTok ได้: ลิงก์นี้ไม่ใช่วิดีโอ หรือเป็นลิงก์สั้น vt.tiktok.com
                            </li>
                          );
                        }
                        return (
                          <li
                            key={`tk-${v.id}`}
                            className="overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20"
                          >
                            <div className="relative aspect-[9/16] w-full">
                              <iframe
                                src={`${src}?autoplay=0&muted=1`}
                                className="absolute inset-0 h-full w-full"
                                title={v.title || "TikTok video"}
                                loading="lazy"
                                // ✅ ทำงานได้แม้มี CSP เข้มงวด และไม่ต้องโหลด embed.js
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                allowFullScreen
                                referrerPolicy="origin-when-cross-origin"
                              />
                            </div>
                            {v.title && (
                              <div className="p-3 text-xs text-white/85 line-clamp-2">
                                {v.title}
                              </div>
                            )}
                          </li>
                        );
                      }
                      return null;
                    })}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>

      {/* Lightbox (Slider + Thumbnails) */}
      {images.length > 0 && (
        <>
          <div
            id="lb"
            data-images={JSON.stringify(images)} // ✅ แหล่งรูปเดียวพอ
            className="fixed inset-0 z-[9999] hidden bg-black/80 p-4 backdrop-blur"
            aria-modal="true"
            role="dialog"
          >
            <button
              id="lb-close"
              className="fixed right-4 top-4 z-[10000] rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20 hover:bg-white/15"
            >
              ปิด
            </button>

            <div className="mx-auto flex h-full w-full max-w-[min(1200px,96vw)] flex-col">
              <div className="relative flex flex-1 items-center justify-center">
                <button
                  id="lb-prev"
                  className="absolute left-2 z-[10000] hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15 md:flex pointer-events-auto cursor-pointer"
                  aria-label="ก่อนหน้า"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div
                  id="lb-stage"
                  className="relative h-[min(78vh,760px)] w-[min(96vw,1200px)] overflow-hidden rounded-2xl ring-1 ring-white/15 bg-black/40"
                >
                  <img
                    id="lb-img"
                    alt=""
                    className="h-full w-full object-contain select-none pointer-events-none"
                    draggable="false"
                  />

                  <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white ring-1 ring-white/10">
                    <span id="lb-count">1 / 1</span>
                  </div>
                </div>

                <button
                  id="lb-next"
                  className="absolute right-2 z-[10000] hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15 md:flex pointer-events-auto cursor-pointer"
                  aria-label="ถัดไป"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-3">
                <div
                  id="lb-thumbs"
                  className="lb-no-scroll no-scrollbar flex gap-2 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                />
                <div className="mt-2 h-px w-full bg-white/10" />
              </div>
            </div>
          </div>

          {/* hide scrollbar */}
          <Script
            id="lb-thumbs-style"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
(function(){
  var s = document.getElementById('lb-thumbs-css');
  if (s) return;
  s = document.createElement('style');
  s.id = 'lb-thumbs-css';
  s.innerHTML = "#lb-thumbs::-webkit-scrollbar{display:none;width:0;height:0}";
  document.head.appendChild(s);
})();`,
            }}
          />

          <Script
            id="lb-controller"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
(function () {
  var W = window, D = document;
  if (W.__LB2) return;

  function qs(id){ return D.getElementById(id); }

  W.__LB2 = {
    images: [],
    idx: 0,

    q: function(){
      this.lb = qs('lb');
      this.img = qs('lb-img');
      this.thumbs = qs('lb-thumbs');
      this.count = qs('lb-count');
    },

    // ✅ อ่านรูปจาก DOM ทุกครั้ง กันค้างร้านเก่า
    readImagesFromDom: function(){
      this.q();
      if (!this.lb) { this.images = []; return; }
      try {
        var raw = this.lb.getAttribute('data-images') || '[]';
        this.images = JSON.parse(raw) || [];
      } catch(_) {
        this.images = [];
      }
    },

    setCount: function(){
      if (!this.count) return;
      var total = this.images.length || 0;
      this.count.textContent = (total ? (this.idx + 1) : 0) + ' / ' + total;
    },

    highlightThumb: function(){
      if (!this.thumbs) return;
      var kids = this.thumbs.children;
      for (var i=0;i<kids.length;i++){
        kids[i].classList.remove('ring-2','ring-amber-400','shadow-[0_0_0_2px_rgba(212,175,55,.55)]');
        kids[i].classList.add('ring-1','ring-white/10');
      }
      var active = kids[this.idx];
      if (active){
        active.classList.remove('ring-1','ring-white/10');
        active.classList.add('ring-2','ring-amber-400','shadow-[0_0_0_2px_rgba(212,175,55,.55)]');
        try { active.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'}); } catch(_){}
      }
    },

    renderThumbs: function(){
      if (!this.thumbs) return;
      this.thumbs.innerHTML = '';
      var self = this;

      this.images.forEach(function(src, i){
        var btn = D.createElement('button');
        btn.type = 'button';
        btn.className = 'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 bg-black/30';
        btn.innerHTML = '<img src="'+ src +'" class="h-full w-full object-cover" loading="lazy" alt="" />';
        btn.addEventListener('click', function(e){
          e.preventDefault();
          self.show(i);
        });
        self.thumbs.appendChild(btn);
      });

      this.highlightThumb();
    },

    show: function(i){
      if (!this.images.length) return;
      this.idx = (i + this.images.length) % this.images.length;
      this.q();

      if (this.img){
        this.img.removeAttribute('src');
        this.img.setAttribute('src', this.images[this.idx] || '');
      }
      this.setCount();
      this.highlightThumb();
    },

    open: function(i){
      this.readImagesFromDom();
      if (!this.lb || !this.images.length) return;

      this.lb.classList.remove('hidden');
      this.renderThumbs();
      this.show(typeof i === 'number' ? i : 0);
    },

    close: function(){
      this.q();
      if (this.lb) this.lb.classList.add('hidden');
      this.idx = 0;
      if (this.img) this.img.removeAttribute('src');
      if (this.thumbs) this.thumbs.innerHTML = '';
    },

    bind: function(){
      if (this.bound) return;
      this.bound = true;
      var self = this;

      // open
      D.addEventListener('click', function(e){
        var t = e.target && e.target.closest && e.target.closest('[data-lb-open]');
        if (!t) return;
        e.preventDefault();
        e.stopPropagation();
        var i = Number(t.getAttribute('data-index') || '0');
        self.open(isFinite(i) ? i : 0);
      }, true);

      // controls + backdrop
      D.addEventListener('click', function(e){
        var t = e.target;
        var lb = qs('lb');
        if (lb && t === lb) { e.preventDefault(); return self.close(); }

        var prev = t && t.closest && t.closest('#lb-prev');
        var next = t && t.closest && t.closest('#lb-next');
        var close = t && t.closest && t.closest('#lb-close');

        if (prev)  { e.preventDefault(); e.stopPropagation(); return self.show(self.idx - 1); }
        if (next)  { e.preventDefault(); e.stopPropagation(); return self.show(self.idx + 1); }
        if (close) { e.preventDefault(); e.stopPropagation(); return self.close(); }
      }, true);

      // keyboard
      D.addEventListener('keydown', function(e){
        if (!self.lb || self.lb.classList.contains('hidden')) return;
        if (e.key === 'Escape') self.close();
        if (e.key === 'ArrowLeft') self.show(self.idx - 1);
        if (e.key === 'ArrowRight') self.show(self.idx + 1);
      });

      // swipe
      var sx = 0, sy = 0, moved = false;
      D.addEventListener('touchstart', function(e){
        var lb = qs('lb');
        if (!lb || lb.classList.contains('hidden')) return;
        if (!e.touches || !e.touches[0]) return;
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        moved = false;
      }, {passive:true});

      D.addEventListener('touchmove', function(){
        var lb = qs('lb');
        if (!lb || lb.classList.contains('hidden')) return;
        moved = true;
      }, {passive:true});

      D.addEventListener('touchend', function(e){
        var lb = qs('lb');
        if (!lb || lb.classList.contains('hidden')) return;
        if (!moved || !e.changedTouches || !e.changedTouches[0]) return;
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){
          if (dx < 0) self.show(self.idx + 1);
          else self.show(self.idx - 1);
        }
      }, {passive:true});
    }
  };

  W.__LB2.bind();
})();`,
            }}
          />
        </>
      )}
    </>
  );
}