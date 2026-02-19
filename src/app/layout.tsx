// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Noto_Sans_Thai } from "next/font/google";
import Script from "next/script";
import Providers from "./_components/Providers";
/* ------------------------------ Font ------------------------------ */
const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-th",
  display: "swap",
});

/* ----------------------------- Constants ----------------------------- */
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://10topawards.com";
export const SITE_URL = RAW_SITE_URL.replace(/\/$/, "");

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";
export const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/$/, "") : "";

const APP_NAME = "TopAward";
const APP_DESC = "รวมรีวิวร้าน/คลินิก/ที่เที่ยว พร้อมรูปภาพและเรตติ้ง จัดหมวดหมู่และค้นหาง่าย";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* บังคับใช้ CLIENT_ID ที่ถูกต้อง */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/* --------------------------- Fetch SEO Data --------------------------- */
type PublicSiteSeo = {
  meta_title?: string;
  meta_description?: string;
  keywords?: string;
  og_image?: string;
  jsonld?: any;
};

async function fetchSeo(): Promise<PublicSiteSeo | null> {
  if (!API_BASE) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("ℹ️ DEV: Missing API_BASE, skip SEO fetch");
    }
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/api/public/seo/site`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (res.status !== 404) {
        console.warn(`ℹ️ SEO API non-200: ${res.status} ${res.statusText}`);
      }
      return null;
    }

    const data = await res.json();
    return data?.site || null;
  } catch (err) {
    console.warn(
      "ℹ️ SEO fetch skipped (dev / backend offline):",
      (err as Error)?.message || err
    );
    return null;
  }
}

/* --------------------------- Next Metadata --------------------------- */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchSeo();

  const title = seo?.meta_title || APP_NAME;
  const desc = seo?.meta_description || APP_DESC;
  const og = seo?.og_image || "/og-image.jpg";
  const kw =
    seo?.keywords?.split(",").map((s) => s.trim()).filter(Boolean) ??
    ["รีวิว", "ร้านค้า", "คลินิก", "ที่เที่ยว", "TopAward"];

  return {
    verification: { google: "AmCgvxN8Swf-ZHjQp_bUq9Q8xKoUdnHSRL2WMQ1FKQA" },
    metadataBase: new URL(SITE_URL),

    // ✅ root เติมท้ายให้เอง (กัน title ซ้ำ)
    title: { default: title, template: `%s | ${APP_NAME}` },

    description: desc,
    applicationName: APP_NAME,
    keywords: kw,

    // ✅ canonical root ปล่อยให้ page ใส่เอง (ถ้าต้องการ)
    // alternates: { canonical: "/" },

    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-touch-icon.png",
    },

    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: APP_NAME,
      title,
      description: desc,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
      locale: "th_TH",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [og],
    },

    robots: { index: true, follow: true },
  };
}

/* ------------------------------ Viewport ------------------------------ */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
  colorScheme: "dark light",
};

/* ------------------------------- Layout ------------------------------- */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${notoThai.variable} min-h-screen bg-[#0f172a] text-white antialiased`}
        style={{
          fontFamily:
            "var(--font-th), system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans Thai', 'Noto Sans', sans-serif",
        }}
      >
        {/* ✅ Organization JSON-LD (ไม่ต้องสร้าง <head>) */}
        <Script
  id="ld-org"
  strategy="beforeInteractive"
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: APP_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/android-chrome-512x512.png`,
      sameAs: [
        "https://www.facebook.com/10topawards",
        "https://www.instagram.com/10topawards",
      ],
    }).replace(/</g, "\\u003c"),
  }}
/>

        {/* GTM */}
        {GTM_ID && (
          <>
            <Script
              id="gtm-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
              }}
            />
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          </>
        )}

        <Providers googleClientId={GOOGLE_CLIENT_ID}>
          {children}
        </Providers>
      </body>
    </html>
  );
}