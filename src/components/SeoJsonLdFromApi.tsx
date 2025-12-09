import 'server-only';

// ⬇⬇⬇ เพิ่ม type ให้รู้ว่าจาก API ส่งอะไรมาได้บ้าง
type SeoPage = {
  id?: string;
  path?: string;
  title?: string | null;
  description?: string | null;
  og_image?: string | null;
  keywords?: string | null;   // ⬅ สำคัญ: ฟิลด์ keywords
  jsonld?: any;
};

// ⬇⬇⬇ ฟังก์ชันหาฐาน URL แบบเดียวกับ AllPagesJsonLd
function getApiBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8899';

  // ตัด /api ทิ้งถ้ามี แล้วตัด / ท้ายสุดอีกที
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

const API_BASE = getApiBase(); // เช่น http://localhost:8899

function normPath(p?: string) {
  if (!p) return '/';
  let s = String(p).trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s;
}

export default async function SeoJsonLdFromApi({ path }: { path: string }) {
  const p = normPath(path);

  // ⬇⬇⬇ เปลี่ยนเป็น /api/public/seo/page ให้ตรงกับ AllPagesJsonLd
  const res = await fetch(
    `${API_BASE}/api/public/seo/page?path=${encodeURIComponent(p)}`,
    {
      cache: 'no-store',
      next: { revalidate: 0 },
    }
  ).catch(() => null);

  if (!res || !res.ok) return null;

  const data = (await res.json().catch(() => null)) as {
    page?: SeoPage;
    jsonld?: any;
  };

  const page = data?.page;
  let jsonld: any = page?.jsonld ?? data?.jsonld;
  if (!jsonld) return null;

  // ถ้า jsonld เป็น string → พยายาม parse ให้เป็น object ก่อน
  if (typeof jsonld === 'string') {
    try {
      jsonld = JSON.parse(jsonld);
    } catch {
      // parse ไม่ได้ก็ปล่อยเป็นเดิม
    }
  }

  // ⬇⬇⬇ เติม keywords ถ้ามีใน page แต่ใน jsonld ยังไม่มี
  if (page?.keywords && typeof jsonld === 'object' && jsonld) {
    if (!('keywords' in jsonld)) {
      jsonld = { ...jsonld, keywords: page.keywords };
    }
  }

  const safe = JSON.stringify(jsonld)
    .replace(/</g, '\\u003c')
    .replace(/<\/script/gi, '<\\/script>'); // กันปิด script ทับ

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}