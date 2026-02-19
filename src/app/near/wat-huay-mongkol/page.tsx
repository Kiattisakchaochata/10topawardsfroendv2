// src/app/near/wat-huay-mongkol/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'คาเฟ่ใกล้วัดห้วยมงคล หัวหิน | รวมร้านแนะนำ | TopAward',
  description:
    'รวมคาเฟ่ใกล้วัดห้วยมงคล หัวหิน คาเฟ่ในสวน คาเฟ่ธรรมชาติ เดินทางง่าย เหมาะแวะพักก่อน–หลังไหว้พระ พร้อมรีวิวและแผนที่',
  alternates: {
    canonical: 'https://www.10topawards.com/near/wat-huay-mongkol',
  },
};

export default async function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* H1 สำคัญมาก */}
      <h1 className="text-3xl font-extrabold">
        คาเฟ่ใกล้วัดห้วยมงคล หัวหิน
      </h1>

      {/* Intro content (สำคัญต่ออันดับ) */}
      <section className="text-slate-300 leading-relaxed">
        <p>
          วัดห้วยมงคลเป็นหนึ่งในสถานที่ท่องเที่ยวสำคัญของหัวหิน
          หลังไหว้พระ หลายคนกำลังมองหา
          <strong> คาเฟ่ใกล้วัดห้วยมงคล </strong>
          เพื่อพักผ่อน ดื่มกาแฟ หรือถ่ายรูปท่ามกลางธรรมชาติ
          หน้านี้รวมร้านคาเฟ่ที่อยู่ไม่ไกล เดินทางสะดวก
          พร้อมรีวิวจริงจาก TopAward
        </p>
      </section>

      {/* List ร้าน (ลิงก์ไป store detail) */}
      <section>
        <h2 className="text-2xl font-bold mb-4">
          ร้านคาเฟ่ใกล้วัดห้วยมงคลที่แนะนำ
        </h2>

        <ul className="space-y-4">
          <li>
            <Link
              href="/store/cmkvi7mu8001ghjnhohw50efn"
              className="text-yellow-400 underline"
            >
              Agro Foresta Café – คาเฟ่ในสวน บรรยากาศธรรมชาติ
            </Link>
            <p className="text-sm text-slate-400">
              คาเฟ่เครื่องดื่มจากผลไม้ในสวน ใกล้วัดห้วยมงคลไม่ถึง 10 นาที
            </p>
          </li>

          {/* เพิ่มร้านอื่นในอนาคต */}
        </ul>
      </section>

      {/* FAQ (ช่วย long-tail SEO) */}
      <section>
        <h2 className="text-xl font-bold mb-2">
          คำถามที่พบบ่อย
        </h2>

        <p className="font-semibold">วัดห้วยมงคลมีคาเฟ่อะไรใกล้บ้าง?</p>
        <p className="text-slate-400 mb-3">
          มีคาเฟ่ในสวนและคาเฟ่ธรรมชาติหลายแห่ง
          โดยเฉพาะเส้นทางหัวหิน–ห้วยมงคล
        </p>
      </section>
    </main>
  );
}