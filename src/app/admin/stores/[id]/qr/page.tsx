// src/app/admin/stores/[id]/qr/page.tsx
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import StoreFeedbackQR from "@/components/admin/StoreFeedbackQR";
import PrintQRSheetButton from "@/components/admin/PrintQRSheetButton";

export const dynamic = "force-dynamic";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api"
).replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

type PageProps = { params: Promise<{ id: string }> };

type Store = {
  id: string;
  name: string;
  slug?: string | null;
};

async function getStore(id: string): Promise<Store | null> {
  try {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value;

    const res = await fetch(
      `${API_URL}/admin/stores/${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const s = (data?.store || data) as Store;
    return s ?? null;
  } catch {
    return null;
  }
}

export default async function StoreQRPage({ params }: PageProps) {
  const { id } = await params;
  const store = await getStore(id);

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-bold mb-4">ไม่พบข้อมูลร้าน</h1>
          <p className="mb-6 text-slate-300">
            ไม่พบร้านที่ต้องการสร้าง QR โปรดกลับไปหน้า Stores แล้วลองใหม่อีกครั้ง
          </p>
          <Link
            href="/admin/stores"
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            ← กลับไปหน้า Stores
          </Link>
        </div>
      </div>
    );
  }

  const slugForQR = store.slug || store.id;

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const publicUrl = `https://10topawards.com/feedback/${slugForQR}`;
  const localUrl = `${siteUrl}/feedback/${slugForQR}`;

  return (
    <div className="relative min-h-screen bg-slate-950 text-white print:bg-white print:text-slate-900">
      {/* ฉากหลังแบบ gradient เฉพาะบนจอ ไม่ใช้ตอน print */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80 print:hidden"
        style={{
          backgroundImage:
            "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.10), transparent 55%)," +
            "radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.08), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 py-6 lg:py-10 print:max-w-[900px] print:px-0">
        {/* header บนจอเท่านั้น */}
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              QR Feedback สำหรับร้าน{" "}
              <span className="bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent">
                {store.name}
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              แนะนำให้แคปหน้าจอหรือพิมพ์แผ่นนี้ไปวางบนโต๊ะให้ลูกค้าสแกนให้คะแนน
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/stores"
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              ← กลับหน้า Stores
            </Link>
            <PrintQRSheetButton />
          </div>
        </div>

        {/* แผ่นที่ใช้พิมพ์จริง */}
        <div className="rounded-[36px] bg-white text-slate-900 shadow-2xl ring-1 ring-black/5 p-6 md:p-10 print:shadow-none print:ring-0">
          {/* Logo + title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/LogoTopAward.png"
                alt="10TopAwards"
                width={160}
                height={60}
                className="h-auto"
              />
            </div>
            <p className="text-xs md:text-sm text-slate-400 mb-1">
              แบบฟอร์มให้คะแนนร้านผ่าน 10TopAwards.com
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              ช่วยให้คะแนนร้านนี้หน่อยครับ 🙏
            </h2>
          </div>

                  {/* กล่อง QR พร้อมกรอบทองรอบทั้งกล่อง (ไม่มีกรอบซ้อนที่ QR) */}
          <div className="mx-auto max-w-md mt-6">
            <div className="rounded-[28px] border-[4px] border-[#FACC15] bg-white px-6 py-8 shadow-[0_14px_40px_rgba(0,0,0,0.08)]">
              <div className="text-center mb-4">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">
                  QR ให้คะแนนร้าน
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  สแกนเพื่อให้คะแนนร้าน {store.name}
                </p>
              </div>

              <div className="flex justify-center py-2">
                <StoreFeedbackQR slug={slugForQR} storeName={store.name} />
              </div>
            </div>
          </div>

          {/* ขั้นตอนการใช้งาน */}
          <div className="mt-8 text-xs md:text-sm text-slate-700">
            <ol className="list-decimal list-inside space-y-1 text-center md:text-left">
              <li>เปิดกล้องมือถือ หรือแอปสแกน QR</li>
              <li>สแกน QR นี้เพื่อเข้าไปให้คะแนนร้าน</li>
              <li>เขียนข้อเสนอแนะเพิ่มเติมได้ตามต้องการ</li>
            </ol>
          </div>

          {/* ข้อความท้ายแผ่น */}
          <p className="mt-6 text-[11px] text-center text-slate-400 leading-relaxed">
            ข้อมูลการให้คะแนนของลูกค้าจะถูกเก็บแบบไม่เปิดเผยตัวตน
            ใช้เพื่อช่วยให้ร้านและ 10TopAwards.com พัฒนาคุณภาพบริการให้ดีขึ้นเท่านั้น
          </p>

          <p className="mt-4 text-[11px] text-center text-slate-400">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold">TopAward.</span> สงวนสิทธิ์
          </p>
        </div>
      </div>
    </div>
  );
}