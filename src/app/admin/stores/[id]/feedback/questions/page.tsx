// src/app/admin/stores/[id]/feedback/questions/page.tsx
import QuestionsClient from "./QuestionsClient";

export type QuestionType = "STAR" | "TEXT" | "YESNO" | "CHOICE";

export type StoreFeedbackQuestion = {
  id: string;
  storeId: string;
  title: string;
  type: QuestionType;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

export default async function AdminStoreFeedbackQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = await params;

  // ✅ ไม่ต้อง SSR fetch แล้ว (Next15 cookies/params strict + ลดปัญหา auth)
  return (
    <div className="min-h-[70vh] bg-[#0F172A] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#FFD700]">จัดการคำถามฟีดแบ็คร้าน</h1>
            <p className="mt-1 text-sm text-gray-300">
              Store ID: <span className="font-mono text-gray-200">{storeId}</span>
            </p>
          </div>

          <a
            href="/admin/stores"
            className="rounded-xl border border-[#FFD700]/40 px-4 py-2 text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/10"
          >
            กลับหน้าร้าน
          </a>
        </div>

        <QuestionsClient storeId={storeId} initialQuestions={[]} initialError={null} />
      </div>
    </div>
  );
}