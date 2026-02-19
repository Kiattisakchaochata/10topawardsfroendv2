// src/app/cafe/[city]/page.tsx
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";

async function getStores(city: string) {
  if (!API_BASE) return [];
  const url = `${API_BASE}/api/public/stores?kind=cafe&city=${encodeURIComponent(city)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? json.stores ?? []);
}

export default async function Page({ params }: { params: { city: string } }) {
  const city = params.city;
  const stores = await getStores(city);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">คาเฟ่{city} แนะนำ 2026</h1>
        <p className="mt-3 max-w-3xl text-base opacity-90">
          รวมคาเฟ่น่าไป พร้อมพิกัด แผนที่ และรีวิวจริงจากผู้ใช้งาน
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-full bg-black/5 px-4 py-2 text-sm" href="/category">
            ดูหมวดหมู่ทั้งหมด
          </Link>
          <Link className="rounded-full bg-black/5 px-4 py-2 text-sm" href={`/restaurant/${city}`}>
            ร้านอาหาร{city}
          </Link>
          <Link className="rounded-full bg-black/5 px-4 py-2 text-sm" href="/cafe">
            รวมคาเฟ่ทุกจังหวัด
          </Link>
        </div>
      </header>

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-black/10 p-6 opacity-80">
          ยังไม่พบคาเฟ่ในพื้นที่นี้ตอนนี้ — ลองดูจังหวัดอื่น หรือกลับมาใหม่อีกครั้งครับ
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s: any) => (
            <Link
              key={s.id}
              href={`/store/${s.id}`}
              className="rounded-2xl border border-black/10 p-4 hover:shadow-sm transition"
            >
              <div className="font-bold">{s.name}</div>
              {s.address ? <div className="mt-1 text-sm opacity-80">{s.address}</div> : null}
              <div className="mt-2 text-sm opacity-80">
                ⭐ {s.ratingAvg ?? "-"} ({s.reviewCount ?? 0} รีวิว)
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}