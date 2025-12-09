// src/components/admin/PrintQRSheetButton.tsx
"use client";

type Props = {
  className?: string;
};

export default function PrintQRSheetButton({ className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        "inline-flex items-center rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-md hover:bg-yellow-500 " +
        className
      }
    >
      พิมพ์แผ่นนี้
    </button>
  );
}