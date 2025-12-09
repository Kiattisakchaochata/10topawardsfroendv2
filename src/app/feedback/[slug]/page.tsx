// src/app/feedback/[slug]/page.tsx
import FeedbackPageClient from "./FeedbackPageClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function FeedbackPage({ params }: PageProps) {
  // 👇 ปลด Promise ของ params (แบบที่ Next แนะนำ)
  const { slug } = await params;

  return <FeedbackPageClient slug={slug} />;
}