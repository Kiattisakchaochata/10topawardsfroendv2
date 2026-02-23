// src/app/feedback/[slug]/FeedbackPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Props = {
  slug: string;
};

type FeedbackQuestionType = "STAR_1_5" | "NUMBER_0_10" | "TEXT";

type Question = {
  id: string;
  key: string;
  label: string;
  type: FeedbackQuestionType;
  required: boolean;
  order_no: number;
};

type ApiQuestions = {
  store: { id: string; name: string; slug: string };
  data: Question[];
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
  "http://localhost:8900"
).replace(/\/$/, "");

// -------- UI helpers --------
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={[
            "text-3xl leading-none transition",
            n <= value ? "text-yellow-400" : "text-slate-300",
          ].join(" ")}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPageClient({ slug }: Props) {
  // -------- store + questions --------
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // answers: { [key]: { number: string; text: string } }
  const [answers, setAnswers] = useState<Record<string, { number: string; text: string }>>({});
  const [comment, setComment] = useState<string>("");

  // submit state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -------- load questions (public) --------
  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      try {
        setLoadingQuestions(true);
        setErrorMsg(null);

        const res = await fetch(
  `/api/public/stores/${encodeURIComponent(slug)}/feedback/questions`,
  { cache: "no-store" }
);

        const json = (await res.json().catch(() => ({}))) as ApiQuestions;

        if (!res.ok) {
          throw new Error((json as any)?.message || "โหลดคำถามไม่สำเร็จ");
        }

        const qs = Array.isArray(json.data) ? json.data : [];
        qs.sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0));

        if (cancelled) return;

        setStoreName(json.store?.name ?? null);
        setQuestions(qs);

        // init answers by key (สำคัญ: ใช้ key ตาม backend)
        const init: Record<string, { number: string; text: string }> = {};
        for (const q of qs) {
          init[q.key] = { number: "", text: "" };
        }
        setAnswers(init);
      } catch (err: any) {
        if (!cancelled) setErrorMsg(err?.message || "โหลดคำถามไม่สำเร็จ");
      } finally {
        if (!cancelled) {
          setLoadingQuestions(false);
          setStoreLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // -------- validate required --------
  const canSubmit = useMemo(() => {
    if (loadingQuestions || submitting) return false;
    if (!questions.length) return false;

    for (const q of questions) {
      if (!q.required) continue;
      const a = answers[q.key];
      if (!a) return false;

      if (q.type === "TEXT") {
        if (!a.text.trim()) return false;
      } else {
        if (!a.number.trim()) return false;
      }
    }
    return true;
  }, [answers, loadingQuestions, questions, submitting]);

  // -------- submit --------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // ✅ payload ใหม่: ส่ง comment เฉพาะตอนมีข้อความจริง ๆ
const payload: any = {
  answers: questions.map((q) => {
    const a = answers[q.key] || { number: "", text: "" };

    if (q.type === "TEXT") {
      return { key: q.key, value_text: a.text.trim() };
    }
    return { key: q.key, value_number: Number(a.number) };
  }),
};

// ✅ ใส่ comment เฉพาะถ้ามีค่า (ไม่ส่ง comment: null / comment: "")
const c = comment.trim();
if (c) payload.comment = c;

// ✅ ยิง endpoint ใหม่ /feedback/submit
const res = await fetch(
  `/api/public/stores/${encodeURIComponent(slug)}/feedback/submit`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }
);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "ส่งข้อมูลไม่สำเร็จ");

      // reset
      const reset: Record<string, { number: string; text: string }> = {};
      for (const q of questions) reset[q.key] = { number: "", text: "" };
      setAnswers(reset);
      setComment("");
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  // -------- success page (reuse style เดิม) --------
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <Image src="/LogoTopAward.png" alt="10TopAwards" width={140} height={40} className="h-auto" />
          </div>

          <h1 className="text-2xl font-bold mb-3 text-slate-900">ขอบคุณสำหรับการให้คะแนน 💛</h1>

          {(storeName || slug) && (
            <p className="text-sm font-semibold text-slate-800 mb-1">
              ร้าน: {storeName || slug}
            </p>
          )}

          <p className="text-slate-600 mb-6 text-sm">
            ความเห็นของคุณช่วยให้ร้านและ 10TopAwards พัฒนาคุณภาพได้ดียิ่งขึ้น
          </p>

          <div className="space-y-3">
            <button
              className="w-full h-11 rounded-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold shadow-md transition"
              onClick={() => setSuccess(false)}
            >
              ให้คะแนนอีกครั้ง
            </button>

            <a
              href="https://10topawards.com"
              className="block w-full h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-md transition leading-[44px]"
            >
              กลับไปหน้าหลัก
            </a>

            <button
              type="button"
              onClick={() => {
                try {
                  window.close();
                } catch {}
                setTimeout(() => {
                  window.location.replace("https://10topawards.com");
                }, 150);
              }}
              className="w-full h-11 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------- form page --------
  const pageLoading = storeLoading || loadingQuestions;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-3 py-4 md:px-4 md:py-6">
      <div className="bg-white rounded-3xl shadow-xl p-5 md:p-8 max-w-xl w-full">
        {/* logo + header */}
        <div className="flex flex-col items-center mb-4">
          <Image src="/LogoTopAward.png" alt="10TopAwards" width={150} height={46} className="h-auto mb-2" />

          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1 text-center">
            ช่วยให้คะแนนร้านนี้หน่อยครับ 🙏
          </h1>

          {pageLoading ? (
            <p className="text-xs text-slate-400">กำลังโหลดข้อมูล...</p>
          ) : storeName ? (
            <p className="text-xs md:text-sm text-slate-600">
              ร้าน: <span className="font-semibold text-slate-800">{storeName}</span>
            </p>
          ) : (
            <p className="text-xs text-red-500">ไม่พบข้อมูลร้าน (ยังสามารถให้คะแนนได้)</p>
          )}

          <p className="text-[11px] md:text-xs text-slate-400 mt-2">
            สแกนจาก QR:{" "}
            <span className="font-semibold text-slate-700 break-all">{slug}</span>
          </p>
        </div>

        {errorMsg && (
          <p className="text-red-500 text-xs text-center mb-3">{errorMsg}</p>
        )}

        {pageLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            กำลังโหลดแบบฟอร์ม...
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            ร้านนี้ยังไม่มีคำถาม (ให้แอดมินไปเพิ่มคำถามก่อน)
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {questions.map((q) => {
              const a = answers[q.key] || { number: "", text: "" };

              return (
                <div key={q.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="block font-semibold text-slate-800 text-sm md:text-base">
                      {q.label}{" "}
                      {q.required ? <span className="text-red-500">*</span> : null}
                    </span>
                    <span className="text-[11px] text-slate-400">{q.type}</span>
                  </div>

                  {q.type === "STAR_1_5" ? (
                    <StarRating
                      value={Number(a.number || 0)}
                      onChange={(v) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.key]: { ...prev[q.key], number: String(v), text: "" },
                        }))
                      }
                    />
                  ) : q.type === "NUMBER_0_10" ? (
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={a.number ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.key]: { ...prev[q.key], number: e.target.value, text: "" },
                        }))
                      }
                      className="w-full h-11 rounded-2xl border-2 border-slate-300 px-3 text-sm md:text-base text-slate-900 focus:outline-none focus:border-yellow-400"
                      placeholder="0 - 10"
                    />
                  ) : (
                    <textarea
                      value={a.text ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.key]: { ...prev[q.key], text: e.target.value, number: "" },
                        }))
                      }
                      className="w-full min-h-[90px] rounded-2xl border-2 border-slate-300 px-3 py-2 text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-yellow-400"
                      placeholder="พิมพ์ความคิดเห็น..."
                    />
                  )}
                </div>
              );
            })}

            {/* comment */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-800 text-sm md:text-base">
                ข้อเสนอแนะเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                className="w-full min-h-[90px] rounded-2xl border-2 border-slate-300 px-3 py-2 text-sm md:text-base
                           text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-yellow-400"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="เช่น ชอบเมนูไหน / อยากให้เพิ่มอะไร / จุดที่ควรปรับปรุง"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full mt-2 h-11 rounded-full bg-yellow-400 hover:bg-yellow-500
                         text-slate-900 font-semibold shadow-md transition
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "กำลังส่ง..." : "ส่งคะแนน"}
            </button>

            <p className="text-[11px] text-center text-slate-400 mt-2">
              ข้อมูลการให้คะแนนนี้จะถูกเก็บแบบไม่เปิดเผยตัวตน เพื่อใช้พัฒนาบริการให้ดีขึ้นเท่านั้น
            </p>
          </form>
        )}
      </div>
    </div>
  );
}