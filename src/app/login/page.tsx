// src/app/login/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Script from "next/script"; // ✅ เพิ่ม: ใช้สคริปต์ฝังในหน้าเพื่อ toggle password
import LoginWithGoogle from "@/components/auth/LoginWithGoogle";

/* ====== ENV / CONST ====== */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";
const LOGIN_PATH = process.env.BACKEND_LOGIN_PATH || "/auth/login";
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

/* ---------------- helpers ---------------- */
function deepFind<T = any>(
  obj: any,
  pick: (k: string, v: any) => T | undefined
): T | undefined {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    const got = pick(k, v);
    if (got !== undefined) return got;
    if (v && typeof v === "object") {
      const child = deepFind(v, pick);
      if (child !== undefined) return child;
    }
  }
}

const deepFindToken = (o: any) =>
  deepFind<string>(o, (k, v) =>
    typeof v === "string" && /token|jwt|access[_-]?token/i.test(k) ? v : undefined
  );

const stripHtml = (s: string) =>
  String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function firstValidationError(data: any): string | undefined {
  if (!data) return;
  if (Array.isArray(data?.errors)) {
    const m = data.errors.find((e: any) => e?.msg || e?.message || e?.error);
    return m?.msg || m?.message || m?.error;
  }
  if (data?.errors && typeof data.errors === "object") {
    const first = (Object.values(data.errors) as any[]).flat?.() ?? Object.values(data.errors);
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
}

function friendlyError(status: number, data: any, rawText: string) {
  const backend =
    data?.message ||
    data?.error ||
    firstValidationError(data) ||
    (typeof data === "string" ? data : "") ||
    rawText ||
    "";
  const msg = stripHtml(backend);
  const lower = msg.toLowerCase();
  if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("wrong"))
    return "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
  if (lower.includes("not found")) return "ไม่พบบัญชีผู้ใช้ หรือข้อมูลไม่ถูกต้อง";

  switch (status) {
    case 400:
    case 401:
      return "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
    case 403:
      return "ไม่มีสิทธิ์เข้าถึงระบบ";
    case 422:
      return msg || "ข้อมูลไม่ครบถ้วนหรือรูปแบบไม่ถูกต้อง";
    case 429:
      return "พยายามหลายครั้งเกินไป โปรดลองใหม่ภายหลัง";
    case 500:
      return "เซิร์ฟเวอร์ขัดข้อง โปรดลองใหม่อีกครั้ง";
    default:
      return msg || "เข้าสู่ระบบไม่สำเร็จ";
  }
}

/* ====== Server Action: login & redirect ====== */
async function login(formData: FormData) {
  "use server";

  const ident = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");

  if (!ident || !password) {
    redirect("/login?error=" + encodeURIComponent("กรุณากรอกข้อมูลให้ครบ"));
  }

  const payload = ident.includes("@")
    ? { email: ident, password }
    : { username: ident, password };

  const res = await fetch(`${API_URL}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  if (!res.ok) {
    const msg = friendlyError(res.status || 400, data, raw);
    redirect("/login?error=" + encodeURIComponent(msg));
  }

  let token: string | undefined =
    data?.token ||
    data?.access_token ||
    data?.accessToken ||
    data?.jwt ||
    data?.data?.token ||
    data?.data?.access_token ||
    data?.user?.token ||
    data?.user?.access_token ||
    deepFindToken(data);

  if (!token) {
    const setCookie = res.headers.get("set-cookie") || "";
    const m = setCookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
    if (m?.[1]) token = m[1];
  }
  if (!token) {
    redirect("/login?error=" + encodeURIComponent("ไม่พบโทเค็นจากเซิร์ฟเวอร์"));
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // แยก role จาก JWT (หรือ /auth/me ภายหลังฝั่ง client ก็ได้)
  function parseJwtRole(t?: string) {
    if (!t) return;
    try {
      const [, payload] = t.split(".");
      if (!payload) return;
      const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
      return json?.role || json?.user?.role || json?.data?.user?.role;
    } catch { return; }
  }

  const role = String(parseJwtRole(token) || "user").toLowerCase();
  redirect(role === "admin" ? "/admin" : "/");
}

/* ====== Page (Server Component) ====== */
type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;
const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v ?? "");

export default async function LoginPage({ searchParams }: { searchParams: SearchParamsInput }) {
  const sp =
    typeof (searchParams as any)?.then === "function"
      ? await (searchParams as Promise<Record<string, string | string[] | undefined>>)
      : (searchParams as Record<string, string | string[] | undefined>);

  const errorText = pickFirst(sp?.error);

  return (
    <div className="min-h-[70vh] grid place-items-center bg-[#0F172A] px-4">
      {/* ✅ สคริปต์ toggle password (ไม่สร้างไฟล์ใหม่) */}
<Script id="toggle-password-script" strategy="afterInteractive">
{`
(function () {
  // จับคลิกทั้งหน้า แล้วตรวจว่าไปกดปุ่ม toggle หรือไม่
  function onClick(e) {
    var target = e.target;
    if (!target) return;

    // หาให้เจอทั้งกรณีกดโดน svg ภายในปุ่ม
    var btn = target.closest && target.closest('#pw-toggle');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    // หา input: ใช้ id ถ้ามี, ไม่งั้นหาภายใน container เดียวกัน
    var input = document.getElementById('password-field')
             || btn.parentElement && btn.parentElement.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;

    var isText = input.getAttribute('type') === 'text';
    input.setAttribute('type', isText ? 'password' : 'text');

    // สลับไอคอน
    var showIcon = btn.querySelector('[data-eye]');
    var hideIcon = btn.querySelector('[data-eye-off]');
    if (showIcon) showIcon.classList.toggle('hidden', !isText);
    if (hideIcon) hideIcon.classList.toggle('hidden', isText);

    // ARIA
    btn.setAttribute('aria-pressed', String(!isText));
    btn.setAttribute('aria-label', isText ? 'แสดงรหัสผ่าน' : 'ซ่อนรหัสผ่าน');
  }

  // ผูกครั้งเดียวกับ document — ใช้ได้ตลอดทุกการนำทาง
  if (!window.__pwToggleBound) {
    document.addEventListener('click', onClick, true);
    window.__pwToggleBound = true;
  }
})();
`}
</Script>

      <form
        action={login}
        className="w-full max-w-md rounded-2xl bg-[#1A1A1A] p-8 shadow-xl ring-1 ring-[#D4AF37]/20"
      >
        <h1 className="mb-6 text-2xl font-bold text-[#FFD700]">เข้าสู่ระบบ</h1>

        {errorText ? (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {decodeURIComponent(errorText)}
          </p>
        ) : null}

        {/* ฟอร์ม username/email + password */}
        <label className="mb-1 block text-sm font-medium text-gray-200">อีเมลหรือชื่อผู้ใช้</label>
        <input
          name="identifier"
          type="text"
          required
          autoComplete="username"
          placeholder="you@email.com หรือ username"
          className="mb-4 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />

        <label className="mb-1 block text-sm font-medium text-gray-200">รหัสผ่าน</label>
        {/* ✅ กล่องรหัสผ่าน + ปุ่มแสดง/ซ่อน */}
        <div className="relative mb-6">
          <input
            id="password-field"            /* <- ใช้ในสคริปต์ */
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 pr-12
                       text-sm text-white placeholder:text-gray-400 shadow-sm
                       focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/40"
          />
          <button
  type="button"
  id="pw-toggle"
  aria-label="แสดงรหัสผ่าน"
  aria-pressed="false"
  title="แสดง/ซ่อนรหัสผ่าน"
  className="absolute right-3 top-1/2 -translate-y-1/2 z-10
             p-1.5 rounded-md text-gray-400
             hover:text-[#FFD700] hover:bg-white/5
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/40
             active:scale-95 transition"
>
  {/* ตาเปิด */}
  <svg data-eye xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" strokeWidth="2" />
  </svg>
  {/* ตาปิด (เริ่มซ่อน) */}
  <svg data-eye-off xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeWidth="2" d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 4.24A10.94 10.94 0 0112 4c6.5 0 10 8 10 8a18.38 18.38 0 01-4.28 5.47M6.11 6.11A18.13 18.13 0 002 12s3.5 7 10 7a10.9 10.9 0 004.24-.88" />
  </svg>
</button>
        </div>

        <button className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-black
                           bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                           hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition">
          เข้าสู่ระบบ
        </button>

        {/* ปุ่ม Google (Client Component) */}
        <div className="mt-4">
          <LoginWithGoogle />
        </div>

        <Link
          href="/"
          className="mt-3 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold
                     text-[#FFD700] border border-[#FFD700]/40 hover:bg-[#FFD700]/10 transition"
        >
          กลับหน้าหลัก
        </Link>

        <p className="mt-6 text-center text-sm text-gray-300">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-semibold text-[#FFD700] hover:underline">
            สร้างบัญชี
          </Link>
        </p>
      </form>
    </div>
  );
}