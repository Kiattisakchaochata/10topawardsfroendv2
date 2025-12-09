// src/app/feedback/[slug]/FeedbackPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  slug: string;
};

// src/app/feedback/[slug]/FeedbackPageClient.tsx

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||        // เผื่อไว้ใช้บน Prod
  process.env.NEXT_PUBLIC_API_BASE ||            // ใช้ตัวนี้บน Dev ตาม .env ของเรา
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
  "http://localhost:8899"
).replace(/\/$/, "");

export default function FeedbackPageClient({ slug }: Props) {
  const [foodRating, setFoodRating] = useState<number>(5);
  const [serviceRating, setServiceRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  // ดึงชื่อร้านจาก slug
  useEffect(() => {
    let cancelled = false;

    async function fetchStore() {
      try {
        setStoreLoading(true);
        const res = await fetch(
  `${API_BASE}/api/stores/${encodeURIComponent(slug)}`
);

        if (!res.ok) {
          throw new Error("ไม่พบข้อมูลร้าน");
        }

        const data = await res.json().catch(() => ({}));
        const store = (data?.store || data) as { name?: string };
        if (!cancelled) {
          setStoreName(store?.name || null);
        }
      } catch {
        if (!cancelled) {
          setStoreName(null);
        }
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    }

    fetchStore();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/public/stores/${encodeURIComponent(slug)}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            food_rating: foodRating,
            service_rating: serviceRating,
            comment,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "ส่งข้อมูลไม่สำเร็จ");
      }

      setSuccess(true);
      setComment("");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // ปุ่มเลือกคะแนน (ทำเป็น grid 5 ช่อง รองรับจอเล็ก)
  const ratingButtons = (
    value: number,
    setter: (v: number) => void
  ) => (
    <div className="grid grid-cols-5 gap-2 w-full">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => setter(n)}
            className={`h-10 md:h-11 rounded-full border text-xs md:text-sm font-semibold transition
              ${
                active
                  ? "bg-yellow-400 border-yellow-500 text-slate-900 shadow-sm"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
          >
            {n} ⭐
          </button>
        );
      })}
    </div>
  );

  // ---------- หน้าขอบคุณหลังส่งสำเร็จ ----------
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/LogoTopAward.png" // ปรับ path ได้ตามที่เก็บโลโก้
              alt="10TopAwards"
              width={140}
              height={40}
              className="h-auto"
            />
          </div>

          <h1 className="text-2xl font-bold mb-3 text-slate-900">
            ขอบคุณสำหรับการให้คะแนน 💛
          </h1>
          {storeName && (
            <p className="text-sm font-semibold text-slate-800 mb-1">
              ร้าน: {storeName}
            </p>
          )}
                    <p className="text-slate-600 mb-6 text-sm">
            ความเห็นของคุณช่วยให้ร้านและ 10TopAwards
            พัฒนาคุณภาพอาหารและการบริการได้ดียิ่งขึ้น
          </p>

          <div className="space-y-3">
            {/* ให้คะแนนอีกรอบ */}
            <button
              className="w-full h-11 rounded-full bg-yellow-400 hover:bg-yellow-500
                         text-slate-900 font-semibold shadow-md transition"
              onClick={() => setSuccess(false)}
            >
              ให้คะแนนอีกครั้ง
            </button>

            {/* กลับไปหน้าหลักเว็บ */}
            <a
              href="https://10topawards.com"
              className="block w-full h-11 rounded-full bg-slate-900 hover:bg-slate-800
                         text-white font-semibold shadow-md transition leading-[44px]"
            >
              กลับไปหน้าหลัก
            </a>

            <button
  type="button"
  onClick={() => {
    // พยายามปิดแท็บ (จะทำงานเฉพาะบางเคส เช่น เปิดจาก window.open / แอปบางตัว)
    try {
      window.close();
    } catch (e) {
      // ignore
    }

    // ถ้าปิดไม่ได้ ส่วนใหญ่จะยังอยู่หน้านี้ → ให้เด้งกลับหน้าหลักแทน
    setTimeout(() => {
      window.location.replace("https://10topawards.com");
    }, 150);
  }}
  className="w-full h-11 rounded-full border border-slate-300
             text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
>
  ปิดหน้าต่าง
</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- หน้าฟอร์มให้คะแนน ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-3 py-4 md:px-4 md:py-6">
      <div className="bg-white rounded-3xl shadow-xl p-5 md:p-8 max-w-xl w-full">
        {/* logo + header */}
        <div className="flex flex-col items-center mb-4">
          <Image
            src="/LogoTopAward.png" // ปรับ path ตามที่เก็บโลโก้จริง
            alt="10TopAwards"
            width={150}
            height={46}
            className="h-auto mb-2"
          />

          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1 text-center">
            ช่วยให้คะแนนร้านนี้หน่อยครับ 🙏
          </h1>

          {storeLoading ? (
            <p className="text-xs text-slate-400">กำลังโหลดข้อมูลร้าน...</p>
          ) : storeName ? (
            <p className="text-xs md:text-sm text-slate-600">
              ร้าน:{" "}
              <span className="font-semibold text-slate-800">
                {storeName}
              </span>
            </p>
          ) : (
            <p className="text-xs text-red-500">
              ไม่พบข้อมูลร้าน (ยังสามารถให้คะแนนได้)
            </p>
          )}

          <p className="text-[11px] md:text-xs text-slate-400 mt-2">
            สแกนจาก QR:{" "}
            <span className="font-semibold text-slate-700 break-all">
              {slug}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* คะแนนรสชาติอาหาร */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="block font-semibold text-slate-800 text-sm md:text-base">
                คะแนนรสชาติอาหาร
              </span>
              <span className="text-lg md:text-xl">🍛</span>
            </div>
            {ratingButtons(foodRating, setFoodRating)}
            <p className="text-[11px] text-slate-400 mt-1">
              1 = ไม่อร่อยเลย • 5 = อร่อยมาก
            </p>
          </div>

          {/* คะแนนการบริการ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="block font-semibold text-slate-800 text-sm md:text-base">
                คะแนนการบริการ
              </span>
              <span className="text-lg md:text-xl">🤝</span>
            </div>
            {ratingButtons(serviceRating, setServiceRating)}
            <p className="text-[11px] text-slate-400 mt-1">
              1 = ไม่ประทับใจเลย • 5 = ประทับใจมาก
            </p>
          </div>

          {/* ข้อเสนอแนะ */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-800 text-sm md:text-base">
              ข้อเสนอแนะเพิ่มเติม (ถ้ามี)
            </label>
            <textarea
              className="w-full min-h-[90px] rounded-2xl border-2 border-slate-300 px-3 py-2 text-sm md:text-base
                         text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-yellow-400
                         focus:ring-0"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เช่น ชอบเมนูไหน / อยากให้เพิ่มอะไร / จุดที่ควรปรับปรุง"
            />
          </div>

          {errorMsg && (
            <p className="text-red-500 text-xs text-center">{errorMsg}</p>
          )}

          <button
  type="submit"
  disabled={loading}
  className="w-full mt-2 h-11 rounded-full bg-yellow-400 hover:bg-yellow-500
             text-slate-900 font-semibold shadow-md
             transition disabled:opacity-60 disabled:cursor-not-allowed"
>
  {loading ? "กำลังส่ง..." : "ส่งคะแนน"}
</button>

          <p className="text-[11px] text-center text-slate-400 mt-2">
            ข้อมูลการให้คะแนนนี้จะถูกเก็บแบบไม่เปิดเผยตัวตน
            เพื่อใช้พัฒนาบริการให้ดีขึ้นเท่านั้น
          </p>
        </form>
      </div>
    </div>
  );
}