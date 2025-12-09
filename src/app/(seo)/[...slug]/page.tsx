// src/app/(seo)/[...slug]/page.tsx
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { buildSeoForPath } from "@/seo/fetchers";
import SeoJsonLdFromApi from "@/components/SeoJsonLdFromApi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

/** ---------- helpers ---------- */
function toAbsolute(u?: string | null) {
  try {
    if (!u || typeof u !== "string") {
      return SITE_URL;
    }
    return new URL(u, SITE_URL + "/").toString();
  } catch {
    return SITE_URL;
  }
}

function toKeywordArray(kw?: string | null): string[] | undefined {
  if (!kw || !kw.trim()) return undefined;
  return kw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}) {
  const slug = params.slug ?? [];
  const seoPath = "/" + slug.join("/");

  const { site, page } = await buildSeoForPath(seoPath);

  if (!page || Object.keys(page).length === 0) {
    return {};
  }

  const title = (page as any)?.title || (site as any)?.meta_title || "Topaward";
  const description =
    (page as any)?.description || (site as any)?.meta_description || "";

  const ogImages: string[] = Array.from(
    new Set(
      [
        ...((Array.isArray((page as any)?.og_images)
          ? (page as any).og_images
          : []) as string[]),
        ...(((page as any)?.og_image ? [(page as any).og_image] : []) as string[]),
        ...(((site as any)?.og_image ? [(site as any).og_image] : []) as string[]),
      ].filter(Boolean) as string[]
    )
  ).slice(0, 4);

  const keywordSource = (page as any)?.keywords ?? (site as any)?.keywords;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: toAbsolute(seoPath),
      type: "website",
      images: ogImages.map((url) => ({ url: toAbsolute(url) })),
      siteName: "Topaward",
    },
    robots: (page as any)?.noindex ? { index: false, follow: false } : undefined,
    keywords: toKeywordArray(keywordSource),
  };
}

/** ---------- Page ---------- */
export default async function SeoPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const slug = params.slug ?? [];
  const seoPath = "/" + slug.join("/");

  const { site, page } = await buildSeoForPath(seoPath);

  if (!page || Object.keys(page).length === 0) {
    return notFound();
  }

  const title = (page as any)?.title || (site as any)?.meta_title || "Topaward";

  return (
    <>
      <Navbar />

      {/* JSON-LD จาก API สำหรับ path ปัจจุบัน */}
      <SeoJsonLdFromApi path={seoPath} />

      <main className="container mx-auto max-w-5xl px-4 md:px-6 py-10 text-white">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        { (page as any)?.description && (
          <p className="opacity-80">{(page as any).description}</p>
        )}
      </main>

      <Footer />
    </>
  );
}