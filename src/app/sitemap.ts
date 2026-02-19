import type { MetadataRoute } from "next";

/* =====================
   URL CONFIG
===================== */
const RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.10topawards.com";
const SITE_URL = RAW_SITE.replace(/\/$/, "").replace(/^http:\/\//, "https://");

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

/**
 * Normalize API_BASE:
 * - trim trailing slash
 * - if env ends with "/api" keep it (because your env is https://www.10topawards.com/api)
 */
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/$/, "") : null;

/* =====================
   SAFE HELPERS
===================== */
function safeDate(input?: string | Date): Date {
  if (!input) return new Date();
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function safeFetchJson<T>(
  url: string,
  opts?: { nextRevalidateSec?: number }
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: opts?.nextRevalidateSec ? { revalidate: opts.nextRevalidateSec } : undefined,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Accept both:
 * - API returns array: []
 * - API returns object: { categories: [] } or { data: [] }
 */
function pickArray(payload: any, key: string): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

/* =====================
   SITEMAP
===================== */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  const now = new Date();

  // --- Static pages ---
  urls.push(
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/category`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/store`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.4, lastModified: now }
  );

  // --- ถ้าไม่มี API base ให้จบแค่นี้ (กัน build พัง) ---
  if (!API_BASE) return urls;

  // --- Categories ---
  // NOTE: your env is https://www.10topawards.com/api so endpoints should be /categories, /stores
  const catJson = await safeFetchJson<any>(`${API_BASE}/categories`, { nextRevalidateSec: 3600 });
  const categories = pickArray(catJson, "categories");

  for (const c of categories) {
    const id = c?.id ?? c?._id;
    if (!id) continue;

    urls.push({
      url: `${SITE_URL}/category/${encodeURIComponent(String(id))}`,
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: safeDate(c.updated_at || c.updatedAt || c.created_at || c.createdAt),
    });
  }

  // --- Stores ---
  const storeJson = await safeFetchJson<any>(`${API_BASE}/stores`, { nextRevalidateSec: 3600 });
  const stores = pickArray(storeJson, "stores");

  const seen = new Set<string>();
  for (const s of stores) {
    const id = s?.id ?? s?._id;
    if (!id) continue;

    // รองรับ is_active / isActive
    const isActive =
      s?.is_active !== undefined ? s.is_active :
      s?.isActive !== undefined ? s.isActive :
      true;

    if (isActive === false) continue;

    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);

    urls.push({
      url: `${SITE_URL}/store/${encodeURIComponent(String(id))}`,
      changeFrequency: "weekly",
      priority: 0.6,
      lastModified: safeDate(s.updated_at || s.updatedAt || s.created_at || s.createdAt),
    });
  }
// --- Near pages (SEO landing) ---
  const nearJson = await safeFetchJson<any>(`${API_BASE}/near-pages`, { nextRevalidateSec: 3600 });
  const nearPages = pickArray(nearJson, "nearPages"); // รองรับ array / {nearPages:[]} / {data:[]}

  for (const p of nearPages) {
    const slug = p?.slug || p?.id;
    if (!slug) continue;

    urls.push({
      url: `${SITE_URL}/near/${encodeURIComponent(String(slug))}`,
      changeFrequency: "weekly",
      priority: 0.65,
      lastModified: safeDate(p.updated_at || p.updatedAt || p.created_at || p.createdAt),
    });
  }
  return urls;
}