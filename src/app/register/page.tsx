// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ✅ เพิ่ม state toggle
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "สมัครสมาชิกไม่สำเร็จ");
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center bg-[#0F172A] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-[#1A1A1A] p-8 shadow-xl ring-1 ring-[#D4AF37]/20"
      >
        <h1 className="mb-6 text-2xl font-bold text-[#FFD700]">สมัครสมาชิก</h1>

        {err ? (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {err}
          </p>
        ) : null}

        <label className="mb-1 block text-sm font-medium text-gray-200">ชื่อ</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อของคุณ"
          required
          autoComplete="name"
          className="mb-4 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />

        <label className="mb-1 block text-sm font-medium text-gray-200">อีเมล</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          type="email"
          required
          autoComplete="email"
          className="mb-4 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />

        <label className="mb-1 block text-sm font-medium text-gray-200">รหัสผ่าน</label>

        {/* ✅ กล่องรหัสผ่าน + ปุ่มแสดง/ซ่อน */}
        <div className="relative mb-6">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            type={showPassword ? "text" : "password"} // toggle ตาม state
            minLength={6}
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 pr-11 text-sm text-white
                       placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                       focus:ring-2 focus:ring-[#FFD700]/40"
          />

          {/* ปุ่ม toggle แสดง/ซ่อน */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5
                       text-gray-300 hover:text-white hover:bg-white/10 transition"
          >
            {showPassword ? (
              // 👁️‍🗨️ ไอคอน "ตาปิด"
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeWidth={2}
                  d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 4.24A10.94 10.94 0 0112 4c6.5 0 10 8 10 8a18.38 18.38 0 01-4.28 5.47M6.11 6.11A18.13 18.13 0 002 12s3.5 7 10 7a10.9 10.9 0 004.24-.88"
                />
              </svg>
            ) : (
              // 👁️ ไอคอน "ตาเปิด"
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeWidth={2}
                  d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                />
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
              </svg>
            )}
          </button>
        </div>

        {/* ปุ่มสมัครสมาชิก */}
        <button
          disabled={loading}
          className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-black
                     bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                     hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition
                     disabled:opacity-60"
        >
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>

        {/* ปุ่มกลับหน้าหลัก */}
        <Link
          href="/"
          className="mt-3 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold
                     text-[#FFD700] border border-[#FFD700]/40 hover:bg-[#FFD700]/10 transition"
        >
          กลับหน้าหลัก
        </Link>

        <p className="mt-6 text-center text-sm text-gray-300">
          มีบัญชีแล้ว?{" "}
          <Link className="font-semibold text-[#FFD700] hover:underline" href="/login">
            เข้าสู่ระบบ
          </Link>
        </p>
      </form>
    </div>
  );
}