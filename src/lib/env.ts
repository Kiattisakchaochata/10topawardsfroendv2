const isProd = process.env.NODE_ENV === "production";

const PROD_SITE = "https://www.10topawards.com";
const DEV_API = "http://localhost:8900";

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || (isProd ? PROD_SITE : "http://localhost:3000"))
    .replace(/\/$/, "");

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ||
   process.env.NEXT_PUBLIC_API_BASE ||
   (isProd ? PROD_SITE : DEV_API))
    .replace(/\/$/, "");

// ✅ กัน /api ซ้ำ: ถ้า API_BASE ลงท้ายด้วย /api อยู่แล้ว ไม่ต้องเติม
export const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;