// src/app/robots.ts
import type { MetadataRoute } from "next";

/* ------------------------------- Constants ------------------------------- */
const RAW = process.env.NEXT_PUBLIC_SITE_URL ?? "https://10topawards.com";
const SITE_URL = RAW.replace(/\/$/, "").replace(/^http:\/\//, "https://");
const PROD_HOST = "10topawards.com";
const isProd = SITE_URL.includes(PROD_HOST);

/* ----------------------------- Export Function ----------------------------- */
export default function robots(): MetadataRoute.Robots {
  // 🧱 ถ้าเป็น dev/staging ให้ block index ทันที ป้องกัน Google มองว่าเป็น duplicate
  if (!isProd) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  // 🌐 Production: allow ทั้งหมด พร้อม sitemap + host + favicon
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",           // ไม่ต้องให้ bot มาเก็บ API route
          "/admin/",         // ไม่ให้ bot มา index หน้า admin
          "/_next/",         // ป้องกัน crawler เก็บ static assets
          "/private/",       // กันพลาดถ้ามีโฟลเดอร์ภายใน
        ],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`],
    host: SITE_URL,

    // 🆕 (optional) — บอก Google ว่า favicon อยู่ที่ไหนโดยตรง
    // แม้ว่า Google จะ detect ได้เอง แต่เพิ่มไว้เพื่อความแน่นอน
    // เพิ่มหัวข้อนี้ช่วย reinforce “favicon” ใน search appearance
    extensions: {
      "favicon": `${SITE_URL}/favicon.ico`,
    } as any,
  };
}