"use client";

import { useEffect, useState } from "react";

type Me = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar_url?: string | null;
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-white/90 mb-1">{children}</label>
);

/* ✅ ปรับให้รองรับการส่ง className เพิ่ม (เช่น pr-11) */
const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none
                placeholder:text-white/40 focus:ring-2 focus:ring-amber-400 disabled:opacity-70 disabled:cursor-not-allowed ${className || ""}`}
  />
);

export default function AccountClient({ me }: { me: Me }) {
  // โปรไฟล์: อ่านอย่างเดียว
  const [name, setName] = useState(me?.name ?? "");
  const [email, setEmail] = useState(me?.email ?? "");

  // password
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showOld, setShowOld] = useState(false); // ✅ toggle ดู/ซ่อน (เดิม)
  const [showNew, setShowNew] = useState(false); // ✅ toggle ดู/ซ่อน (ใหม่)
  const [changing, setChanging] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  useEffect(() => {
    setName(me?.name ?? "");
    setEmail(me?.email ?? "");
  }, [me?.name, me?.email]);

  async function changePassword() {
    setChanging(true);
    setPwdMsg(null);
    setPwdErr(null);
    try {
      const r = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
      });
      const t = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(t);
      } catch {}
      if (!r.ok) throw new Error(j?.message || t || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      setPwdMsg(j?.message || "เปลี่ยนรหัสผ่านเรียบร้อย");
      setOldPwd("");
      setNewPwd("");
    } catch (e: any) {
      setPwdErr(e?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile (view only) */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-lg font-bold mb-4">โปรไฟล์</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>ชื่อที่แสดง</Label>
            <Input value={name} disabled />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
        </div>
      </section>

      {/* Password */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-lg font-bold mb-4">เปลี่ยนรหัสผ่าน</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* รหัสผ่านเดิม */}
          <div className="relative">
            <Label>รหัสผ่านเดิม</Label>
            <Input
              type={showOld ? "text" : "password"}
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="••••••••"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowOld((v) => !v)}
              aria-label={showOld ? "ซ่อนรหัสผ่านเดิม" : "แสดงรหัสผ่านเดิม"}
              className="absolute right-2 top-[38px] -translate-y-1/2 rounded-md p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              {showOld ? (
                // ไอคอน "ตาปิด"
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 4.24A10.94 10.94 0 0112 4c6.5 0 10 8 10 8a18.38 18.38 0 01-4.28 5.47M6.11 6.11A18.13 18.13 0 002 12s3.5 7 10 7a10.9 10.9 0 004.24-.88" />
                </svg>
              ) : (
                // ไอคอน "ตาเปิด"
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                </svg>
              )}
            </button>
          </div>

          {/* รหัสผ่านใหม่ */}
          <div className="relative">
            <Label>รหัสผ่านใหม่</Label>
            <Input
              type={showNew ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="อย่างน้อย 8 ตัว"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"}
              className="absolute right-2 top-[38px] -translate-y-1/2 rounded-md p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              {showNew ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 4.24A10.94 10.94 0 0112 4c6.5 0 10 8 10 8a18.38 18.38 0 01-4.28 5.47M6.11 6.11A18.13 18.13 0 002 12s3.5 7 10 7a10.9 10.9 0 004.24-.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={2} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                </svg>
              )}
            </button>
          </div>
        </div>

        {pwdMsg && (
          <p className="mt-3 rounded-lg bg-emerald-500/15 text-emerald-200 px-3 py-2 text-sm">
            {pwdMsg}
          </p>
        )}
        {pwdErr && (
          <p className="mt-3 rounded-lg bg-rose-500/15 text-rose-200 px-3 py-2 text-sm">
            {pwdErr}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={changePassword}
            disabled={changing || !oldPwd || !newPwd}
            className="rounded-lg bg-white px-4 py-2 text-slate-900 font-medium shadow hover:opacity-90 active:scale-[.98] disabled:opacity-60"
          >
            {changing ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </div>
      </section>
    </div>
  );
}