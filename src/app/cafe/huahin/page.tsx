// src/app/cafe/huahin/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

const SITE = "https://www.10topawards.com";
const PAGE_URL = `${SITE}/cafe/huahin`;

const CITY = "หัวหิน";
const PROVINCE = "ประจวบคีรีขันธ์";
const KIND = "cafe";

// ✅ SEO metadata
export const metadata: Metadata = {
  title: "คาเฟ่หัวหิน 2026 | คาเฟ่น่าไป ใกล้ฉัน วิวสวย รีวิวจริง",
  description:
    "รวมคาเฟ่หัวหินน่าไป อัปเดตล่าสุด คาเฟ่ในสวน คาเฟ่วิวดี ใกล้สถานที่ดัง พร้อมพิกัด แผนที่ และรีวิวจริงจากผู้ใช้งาน",

  // ✅ ใส่กลับให้ครบแบบเดิม
  robots: { index: true, follow: true },
  keywords:
    "คาเฟ่หัวหิน, คาเฟ่หัวหินใกล้ฉัน, คาเฟ่ในสวน หัวหิน, ร้านกาแฟหัวหิน, คาเฟ่ประจวบคีรีขันธ์, คาเฟ่วิวสวยหัวหิน, คาเฟ่ร้านของฝาก",

  alternates: {
    canonical: PAGE_URL,
  },

  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "คาเฟ่หัวหิน 2026 | คาเฟ่น่าไป ใกล้ฉัน วิวสวย รีวิวจริง | 10TopAwards",
    description:
      "รวมคาเฟ่หัวหินน่าไป อัปเดตล่าสุด คาเฟ่ในสวน คาเฟ่วิวดี ใกล้สถานที่ดัง พร้อมพิกัด แผนที่ และรีวิวจริงจากผู้ใช้งาน",
    images: [
      {
        url: `${SITE}/og-image.jpg`,
        width: 1200,
        height: 630,
      },
    ],
    siteName: "TopAward",
    locale: "th_TH",
  },

  twitter: {
    card: "summary_large_image",
    title: "คาเฟ่หัวหิน 2026 | คาเฟ่น่าไป ใกล้ฉัน วิวสวย รีวิวจริง | 10TopAwards",
    description:
      "รวมคาเฟ่หัวหินน่าไป อัปเดตล่าสุด คาเฟ่ในสวน คาเฟ่วิวดี ใกล้สถานที่ดัง พร้อมพิกัด แผนที่ และรีวิวจริงจากผู้ใช้งาน",
    images: [`${SITE}/og-image.jpg`],
  },
};

// -------------------------------------------------------
// helper: normalize response ให้เป็น array เสมอ
// -------------------------------------------------------
function normalizeToArray(input: any) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  if (Array.isArray(input?.data?.data)) return input.data.data;
  if (Array.isArray(input?.items)) return input.items;
  return [];
}

function isHuaHinCafe(s: any) {
  const kind = String(s?.kind ?? s?.store_kind ?? s?.type ?? "").toLowerCase();
  const category = String(s?.category ?? s?.categoryName ?? s?.category_name ?? "").toLowerCase();

  const kindOk = !kind ? true : kind === KIND;
  const categoryOk = !category ? true : category.includes("cafe") || category.includes("คาเฟ่");

  const norm = (v: any) =>
    String(v ?? "")
      .toLowerCase()
      .replace(/[\s]+/g, " ")
      .replace(/อำเภอ|อ\./g, "")
      .replace(/ตำบล|ต\./g, "")
      .replace(/จังหวัด|จ\./g, "")
      .trim();

  const cityRaw = s?.city ?? s?.address_city ?? s?.location_city ?? s?.district ?? s?.amphoe ?? s?.address_amphoe;
  const provinceRaw =
    s?.province ?? s?.address_province ?? s?.location_province ?? s?.changwat ?? s?.address_changwat;

  const addressRaw =
    s?.address ??
    s?.fullAddress ??
    s?.location_text ??
    s?.google_address ??
    s?.address_text ??
    s?.formatted_address;

  const subdistrictRaw = s?.subdistrict ?? s?.tambon ?? s?.address_tambon;

  const city = norm(cityRaw);
  const province = norm(provinceRaw);
  const address = norm(addressRaw);
  const subdistrict = norm(subdistrictRaw);

  const haystack = `${city} ${subdistrict} ${province} ${address}`.trim();

  const cityTh = norm(CITY);
  const provinceTh = norm(PROVINCE);

  const cityEnOk = haystack.includes("hua hin");
  const provinceEnOk = haystack.includes("prachuap") || haystack.includes("prachuap khiri khan");

  const cityOk = haystack.includes(cityTh) || cityEnOk;
  const provinceOk = haystack.includes(provinceTh) || provinceEnOk;

  const hasAnyLocation = Boolean(city || province || address || subdistrict);

  const locationOk = hasAnyLocation ? cityOk && provinceOk : true;

  return kindOk && categoryOk && locationOk;
}

// -------------------------------------------------------
// fetch: cafes hua hin
// -------------------------------------------------------
async function getCafesHuaHin() {
  try {
    const qs = new URLSearchParams({
      kind: KIND,
      city: CITY,
      province: PROVINCE,
    });

    const url = `${SITE}/api/public/stores?${qs.toString()}`;

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    const json = await res.json();
    const arr = normalizeToArray(json);

    const filtered = arr.filter(isHuaHinCafe);

    return filtered;
  } catch {
    return [];
  }
}

export default async function CafeHuaHinPage() {
  const stores = await getCafesHuaHin();
  const safeStores = Array.isArray(stores) ? stores : [];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${PAGE_URL}#itemlist`,
    url: PAGE_URL,
    name: "รายชื่อคาเฟ่หัวหิน",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: safeStores.length,
    itemListElement: safeStores.map((s: any, idx: number) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE}/store/${s.id}`,
      name: s.name,
    })),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <script
        id="ld-itemlist-cafe-huahin"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList, null, 2) }}
      />

      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          คาเฟ่หัวหิน แนะนำ 2026
        </h1>

        <p className="mt-3 max-w-3xl text-base opacity-90">
          กำลังมองหา <b>คาเฟ่หัวหิน</b> หรือ <b>คาเฟ่ใกล้ฉัน</b> อยู่ใช่ไหม?
          หน้านี้รวมคาเฟ่หัวหิน จังหวัด<b>ประจวบคีรีขันธ์</b> ที่น่าไป
          ทั้งคาเฟ่ในสวน คาเฟ่วิวดี ร้านกาแฟบรรยากาศธรรมชาติ
          พร้อมลิงก์พิกัด แผนที่ และรีวิวจริงจากผู้ใช้งาน
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-full bg-black/5 px-4 py-2 text-sm" href="/category">
            ดูหมวดหมู่ทั้งหมด
          </Link>
          <Link className="rounded-full bg-black/5 px-4 py-2 text-sm" href="/restaurant/huahin">
            ร้านอาหารหัวหิน
          </Link>
          <Link className="rounded-full bg-black/5 px-4 py-2 text-sm" href="/cafe">
            รวมคาเฟ่ทุกจังหวัด
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {safeStores.map((s: any) => (
          <article
            key={s.id}
            className="rounded-2xl border border-black/10 p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold line-clamp-2">
              <Link href={`/store/${s.id}`} className="hover:underline">
                {s.name}
              </Link>
            </h2>

            <p className="mt-2 text-sm opacity-80">
              พื้นที่: {CITY}, {PROVINCE}
            </p>

            {s.description ? (
              <p className="mt-2 text-sm line-clamp-3 opacity-90">{s.description}</p>
            ) : (
              <p className="mt-2 text-sm line-clamp-2 opacity-70">
                ดูรายละเอียดร้าน พิกัด แผนที่ และรีวิวเพิ่มเติม
              </p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <Link
                href={`/store/${s.id}`}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                ดูรีวิวร้าน
              </Link>

              {typeof s.avgRating === "number" ? (
                <span className="text-sm font-semibold">⭐ {s.avgRating.toFixed(1)}</span>
              ) : null}
            </div>
          </article>
        ))}

        {safeStores.length === 0 && (
          <div className="rounded-2xl border border-black/10 p-6 opacity-80 sm:col-span-2 lg:col-span-3">
            ยังไม่พบคาเฟ่หัวหินในระบบ (หรือ API filter ยังไม่พร้อม) — แต่โครงหน้า SEO ใช้งานได้แล้ว ✅
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-black/10 p-5">
        <h3 className="text-xl font-bold">คำแนะนำเลือกคาเฟ่หัวหิน</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm opacity-90">
          <li>ถ้าอยากได้บรรยากาศธรรมชาติ ให้เลือกคาเฟ่ในสวน/ใกล้เขา</li>
          <li>ถ้าอยากถ่ายรูป แนะนำคาเฟ่ที่มีมุม outdoor และแสงดีช่วงบ่าย</li>
          <li>ถ้าค้นหา “คาเฟ่ใกล้ฉัน” ให้เปิด Location ในมือถือและลองค้นใน Incognito</li>
        </ul>
      </section>
    </main>
  );
}