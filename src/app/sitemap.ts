// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://10topawards.com";
const SITE_URL = RAW_SITE.replace(/\/$/, "").replace(/^http:\/\//, "https://");

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/$/, "") : null;

// ... safeDate / safeFetchJson เหมือนเดิม

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  const now = new Date();

  urls.push(
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/category`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/store`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/login`, changeFrequency: "daily", priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/register`, changeFrequency: "daily", priority: 0.6, lastModified: now },
  );

  // ถ้าไม่มี API_BASE ก็คืนแค่ static ก่อน (กันพัง)
  if (!API_BASE) return urls;

  // เรียก backend แบบถูก path: /api/...
  const catJson = await safeFetchJson<any>(`${API_BASE}/api/categories`, { nextRevalidateSec: 3600 });
  const categories = Array.isArray(catJson) ? catJson : (catJson?.categories ?? []);

  for (const c of categories) {
    if (!c?.id) continue;
    urls.push({
      url: `${SITE_URL}/category/${encodeURIComponent(c.id)}`,
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: safeDate(c.updated_at || c.created_at),
    });
  }

  const storeJson = await safeFetchJson<any>(`${API_BASE}/api/stores`, { nextRevalidateSec: 3600 });
  const stores = Array.isArray(storeJson) ? storeJson : (storeJson?.stores ?? []);

  const seen = new Set<string>();
  for (const s of stores) {
    if (!s?.id || s.is_active === false) continue;
    if (seen.has(s.id)) continue;
    seen.add(s.id);

    urls.push({
      url: `${SITE_URL}/store/${encodeURIComponent(s.id)}`,
      changeFrequency: "weekly",
      priority: 0.6,
      lastModified: safeDate(s.updated_at || s.created_at),
    });
  }

  return urls;
}