// src/components/admin/StoreFeedbackQR.tsx
"use client";

import QRCode from "react-qr-code";

type StoreFeedbackQRProps = {
  slug: string;
  storeName: string; // จะยังรับไว้เผื่อใช้ทีหลัง แต่ตอนนี้ไม่เอาไปแสดง
};

export default function StoreFeedbackQR({ slug }: StoreFeedbackQRProps) {
  const feedbackUrl = `https://10topawards.com/feedback/${encodeURIComponent(
    slug
  )}`;

  return (
    <div className="bg-white p-2 rounded-xl">
      <QRCode value={feedbackUrl} size={220} />
    </div>
  );
}