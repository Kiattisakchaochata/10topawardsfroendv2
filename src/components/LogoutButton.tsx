"use client";

import { useState } from "react";

export default function LogoutButton({
  className = "ml-4 rounded-lg bg-[#8b4c00] px-4 py-2 text-white text-[15px] font-semibold shadow hover:bg-[#733e00] transition",
  children = "ออกจากระบบ",
}: { className?: string; children?: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    try {
      setLoading(true);

      await fetch("/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (err) {
      console.error("logout failed:", err);
    } finally {
      try {
        localStorage.removeItem("token");
      } catch {}

      // บังคับโหลดหน้าใหม่จริง แก้อาการ state ค้างหลัง logout
      window.location.href = "/";
    }
  };

  return (
    <button onClick={onLogout} className={className} disabled={loading}>
      {loading ? "กำลังออก..." : children}
    </button>
  );
}