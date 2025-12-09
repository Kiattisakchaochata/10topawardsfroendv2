// src/app/_seo/AllPagesJsonLd.tsx
import React from "react";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ให้ TypeScript รู้หน้าตา object จาก API (ปรับได้ตามจริง)
type SeoPage = {
  id?: string;
  path?: string;
  title?: string | null;
  description?: string | null;
  og_image?: string | null;
  keywords?: string | null;
  jsonld?: any;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const jsonSafe = (o: any) =>
  JSON.stringify(o, null, 2)       // ⬅ เพิ่ม indent 2 ช่อง
    .replace(/</g, "\\u003c")
    .replace(/<\/script/gi, "<\\/script>");

/**
 * ✅ แก้ logic การหา API_BASE ไม่ให้กลายเป็น /api/api/...
 * สมมติว่า NEXT_PUBLIC_API_URL = "https://10topawards.com/api"
 * เราจะ trim ให้เหลือ origin = "https://10topawards.com"
 * แล้วค่อยต่อ /api/public/seo/pages เอง
 */
function getApiBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8899";

  // ตัดท้าย "/api" ถ้ามี แล้วตัด "/" ท้ายสุด
  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

async function getAllSeoPages(): Promise<SeoPage[]> {
  const API_BASE = getApiBase();
  const url = `${API_BASE}/api/public/seo/pages`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      // next: { revalidate: 0 }  // ใน RSC ไม่จำเป็นมาก แต่จะใส่ก็ได้
    });

    if (!res.ok) {
      console.error("[AllPagesJsonLd] fetch seo pages failed:", res.status, url);
      return [];
    }

    const j = await res.json().catch(() => ({}));
    return (j?.pages || []) as SeoPage[];
  } catch (err: any) {
    // ✅ ป้องกัน TypeError: fetch failed ให้ทั้งหน้าโหลดได้ปกติ
    console.error("[AllPagesJsonLd] fetch error:", err?.message || err);
    return [];
  }
}

export default async function AllPagesJsonLd() {
  const pages = await getAllSeoPages();

  if (!pages || pages.length === 0) return null;

  return (
    <>
      {pages.map((p, idx) => {
        // ✅ บีบให้ path เป็น string ที่ปลอดภัยเสมอ
        let relPath = "/";
        if (p && typeof p.path === "string" && p.path.trim()) {
          relPath = p.path.trim();
        }

        let absUrl = SITE_URL;
        try {
          absUrl = new URL(relPath, SITE_URL).toString();
        } catch (e) {
          console.error(
            "[AllPagesJsonLd] bad path from API:",
            p?.path,
            (e as Error).message
          );
          // ถ้า error ให้ fallback เป็น SITE_URL ไปเลย
          absUrl = SITE_URL;
        }

        let data: any =
          p?.jsonld && typeof p.jsonld === "object"
            ? p.jsonld
            : {
                "@context": "https://schema.org",
                "@type": "WebPage",
                url: absUrl, // ⬅ ใช้ absUrl ที่เรา handle แล้ว
                name: p?.title || undefined,
                description: p?.description || undefined,
                image: p?.og_image ? [p.og_image] : undefined,
              };

        // ✅ ถ้าใน DB มี keywords แต่ใน jsonld ยังไม่มี → เติมให้
        if (p?.keywords && typeof data === "object" && data && !data.keywords) {
          data = { ...data, keywords: p.keywords };
        }

        return (
          <script
            key={p?.id || idx}
            id={`ld-seo-${idx}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonSafe(data) }}
          />
        );
      })}
    </>
  );
}