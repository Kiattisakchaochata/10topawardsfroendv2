// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "10topawards.com" },
      { protocol: "https", hostname: "www.10topawards.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },

      // ✅ รูปจาก TikTok/YouTube/Google ที่ใช้จริง
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "maps.gstatic.com" },
      { protocol: "https", hostname: "www.gstatic.com" },
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "**.ttwstatic.com" },
    ],
  },

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  },

  async headers() {
    /* ---------------------- DEV MODE ---------------------- */
    if (isDev) {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "worker-src 'self' blob:",

                // ✅ DEV: scripts (Google + TikTok + Facebook + GTM)
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com https://*.ttwstatic.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com",

                // ✅ DEV: script elements
                "script-src-elem 'self' 'unsafe-inline' https://accounts.google.com https://www.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com https://*.ttwstatic.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com",

                // ✅ DEV: iframes (GSI, recaptcha, TikTok, YouTube, Facebook)
                "frame-src 'self' https://accounts.google.com https://www.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com https://www.facebook.com https://connect.facebook.net",

                // (เผื่อเบราว์เซอร์บางตัว)
                "child-src 'self' https://accounts.google.com https://www.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com https://www.facebook.com https://connect.facebook.net",

                // ✅ DEV: network calls (เพิ่ม FB + GTM + GA + graph.facebook.com)
                "connect-src * https://oauth2.googleapis.com https://*.ttwstatic.com https://www.facebook.com https://connect.facebook.net https://graph.facebook.com https://www.googletagmanager.com https://www.google-analytics.com",

                // ✅ DEV: รูปภาพ (ปล่อย * อยู่แล้ว)
                "img-src * data: blob: 'unsafe-inline'",

                // ✅ DEV: styles
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://*.ttwstatic.com",
                "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://*.ttwstatic.com",

                "font-src 'self' https://fonts.gstatic.com data:",
              ].join("; "),
            },
          ],
        },
      ];
    }

    /* ---------------------- PROD MODE ---------------------- */
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",

      // ✅ PROD: Scripts: Google (GSI/recaptcha/Maps), TikTok, YouTube, TikTok static, Facebook, GTM
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com https://*.ttwstatic.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com",
      "script-src-elem 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com https://*.ttwstatic.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com",

      // ✅ PROD: Frames (embeds)
      "frame-src 'self' https://www.google.com https://accounts.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com https://www.facebook.com https://connect.facebook.net",
      "child-src 'self' https://www.google.com https://accounts.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com https://www.facebook.com https://connect.facebook.net",

      // ✅ PROD: Network calls
      "connect-src 'self' https://10topawards.com https://www.10topawards.com https://www.google.com https://www.googleapis.com https://maps.googleapis.com https://*.tiktok.com https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.youtube.com https://*.ttwstatic.com https://www.facebook.com https://connect.facebook.net https://graph.facebook.com https://www.googletagmanager.com https://www.google-analytics.com",

      // ✅ PROD: Images/Icons — เพิ่ม 10topawards.com + www.10topawards.com
      "img-src 'self' data: blob: https://10topawards.com https://www.10topawards.com https://res.cloudinary.com https://images.unsplash.com https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://i.ytimg.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://maps.gstatic.com https://www.gstatic.com https://*.ggpht.com https://maps.googleapis.com https://*.ttwstatic.com https://www.facebook.com https://connect.facebook.net https://graph.facebook.com https://www.google-analytics.com",

      // ✅ PROD: Styles/Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://*.ttwstatic.com",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://*.ttwstatic.com",
      "font-src 'self' https://fonts.gstatic.com data:",
    ].join("; ");

    const coopUnsafeNone = {
      key: "Cross-Origin-Opener-Policy",
      value: "unsafe-none",
    };
    const coopAllowPopups = {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
    };

    return [
      { source: "/", headers: [coopUnsafeNone] },
      { source: "/auth/opener", headers: [coopUnsafeNone] },
      { source: "/login", headers: [coopUnsafeNone] },
      { source: "/auth/:path*", headers: [coopUnsafeNone] },
      { source: "/api/auth/google/callback", headers: [coopUnsafeNone] },

      {
        source: "/:path*",
        headers: [
          coopAllowPopups,
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;