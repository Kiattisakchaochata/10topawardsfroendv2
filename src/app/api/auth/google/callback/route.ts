// src/app/api/auth/google/callback/route.ts
import { NextResponse } from "next/server";

const RECAPTCHA_SECRET =
  process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_SECRET_KEY || "";

const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || "0.5");
const EXPECT_HOST = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ).hostname;
  } catch {
    return "localhost";
  }
})();

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8899"
).replace(/\/$/, "");
const OAUTH_BACKEND_ENDPOINT = `${API_BASE}/api/auth/oauth/google`;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";
const IS_PROD = process.env.NODE_ENV === "production";

// ใช้ค่าเดียว ตามที่ @react-oauth/google แนะนำ
const REDIRECT_URI = "postmessage";

console.log("🔧 [/api/auth/google/callback] CONFIG", {
  NODE_ENV: process.env.NODE_ENV,
  API_BASE,
  OAUTH_BACKEND_ENDPOINT,
  EXPECT_HOST,
  CLIENT_ID: CLIENT_ID ? "(set)" : "(missing)",
  CLIENT_SECRET: CLIENT_SECRET ? "(set)" : "(missing)",
});

/* ---------------- helper: exchange code ---------------- */

async function exchangeCodeForTokens(code: string) {
  console.log("🔄 [callback] exchangeCodeForTokens start", { hasCode: !!code });

  const params = new URLSearchParams();
  params.set("code", code);
  params.set("client_id", CLIENT_ID);
  params.set("client_secret", CLIENT_SECRET);
  params.set("redirect_uri", REDIRECT_URI);
  params.set("grant_type", "authorization_code");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    let errJson: any = {};
    try {
      errJson = JSON.parse(text);
    } catch {}

    console.error("❌ [callback] Google token exchange failed", {
      status: res.status,
      error: errJson?.error,
      error_description: errJson?.error_description,
      raw: text,
    });

    return NextResponse.json(
      {
        ok: false,
        stage: "token",
        error: errJson?.error,
        error_description: errJson?.error_description || text,
      },
      { status: 400 }
    );
  }

  try {
    const json = JSON.parse(text);
    console.log("✅ [callback] token exchange ok", {
      hasAccessToken: !!json.access_token,
      hasIdToken: !!json.id_token,
    });
    return json;
  } catch {
    console.error("❌ [callback] token exchange JSON parse failed:", text);
    return {};
  }
}

/** ✅ ตรวจ reCAPTCHA v3: token + action (+score/hostname เฉพาะ prod) */
async function verifyRecaptcha(token?: string, expectedAction?: string) {
  console.log("🔐 [callback] verifyRecaptcha start", {
    hasToken: !!token,
    expectedAction,
  });

  if (!token) return { success: false, reason: "missing-token" };
  if (!RECAPTCHA_SECRET) return { success: false, reason: "missing-secret" };

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token }),
    cache: "no-store",
  });

  const json: any = await res.json().catch(() => ({}));
  console.log("ℹ️ [callback] reCAPTCHA verify detail:", json);

  const success = !!json?.success;
  const actionOk = expectedAction ? json?.action === expectedAction : true;
  const scoreOk =
    !IS_PROD || typeof json?.score !== "number" || json.score >= RECAPTCHA_MIN_SCORE;
  const hostOk = !IS_PROD || !json?.hostname || json.hostname === EXPECT_HOST;

  const ok = success && actionOk && scoreOk && hostOk;

  const result = {
    success: ok,
    detail: json,
    reason: ok
      ? undefined
      : `failed(${[
          !success && "success",
          !actionOk && `action:${json?.action}`,
          !scoreOk && `score:${json?.score}`,
          !hostOk && `host:${json?.hostname}`,
        ]
          .filter(Boolean)
          .join(",")})`,
  };

  console.log("🔐 [callback] verifyRecaptcha result:", result);
  return result;
}

/* ---------------- route handler ---------------- */

export async function POST(req: Request) {
  console.log("🚀 [/api/auth/google/callback] POST hit");

  try {
    const body = await req.json().catch(() => ({} as any));
    const { code, recaptchaToken, action } = body || {};

    console.log("ℹ️ [callback] incoming body", {
      hasCode: !!code,
      hasRecaptchaToken: !!recaptchaToken,
      action,
    });

    if (!code) {
      console.error("❌ [callback] Missing authorization code");
      return NextResponse.json(
        { ok: false, message: "Missing authorization code" },
        { status: 400 }
      );
    }

    // ✅ ตรวจ reCAPTCHA ก่อน
    const vr = await verifyRecaptcha(recaptchaToken, action || "login");
    if (!vr.success) {
      console.error("❌ [callback] reCAPTCHA failed", vr);
      return NextResponse.json(
        {
          ok: false,
          stage: "recaptcha",
          message: "reCAPTCHA verification failed",
          detail: vr.detail,
          reason: vr.reason,
        },
        { status: 401 }
      );
    }

    // แลก code กับ Google
    const tokenRes: any = await exchangeCodeForTokens(code);
    if (tokenRes instanceof Response) {
      console.log("⚠️ [callback] tokenRes is Response (error already returned)");
      return tokenRes; // error จากด้านบน
    }

    const payload =
      tokenRes?.id_token
        ? { id_token: tokenRes.id_token }
        : tokenRes?.access_token
        ? { access_token: tokenRes.access_token }
        : {};

    console.log("ℹ️ [callback] payload to backend", {
      hasIdToken: !!(payload as any).id_token,
      hasAccessToken: !!(payload as any).access_token,
    });

    if (!Object.keys(payload).length) {
      console.error("❌ [callback] No id_token/access_token from Google");
      return NextResponse.json(
        { ok: false, stage: "token", message: "No id_token/access_token from Google" },
        { status: 400 }
      );
    }

    console.log(
      "➡️ [callback] calling backend OAuth endpoint:",
      OAUTH_BACKEND_ENDPOINT
    );

    const r = await fetch(OAUTH_BACKEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // credentials ไม่กระทบ cookie ขาออก แต่ใส่ไว้ไม่เสียหาย
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const txt = await r.text().catch(() => "");
    let data: any = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      console.warn("⚠️ [callback] backend JSON parse failed, raw=", txt);
    }

    console.log("ℹ️ [callback] backend response status/body", {
      status: r.status,
      ok: r.ok,
      data,
    });

    if (!r.ok || !data?.ok) {
      console.error("❌ [callback] backend auth failed");
      return NextResponse.json(
        {
          ok: false,
          stage: "backend",
          message: data?.message || txt || "Backend auth failed",
        },
        { status: r.status || 400 }
      );
    }

    const resp = NextResponse.json({ ok: true, ...data });

    // ❗️ไม่สน cookie จาก backend แล้ว — ให้ Next เป็นคน set ให้ browser เอง
    if (data?.token) {
      console.log("🍪 [callback] setting auth cookie on response", {
        cookieName: AUTH_COOKIE_NAME,
        IS_PROD,
      });

      resp.cookies.set(AUTH_COOKIE_NAME, data.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        path: "/",
      });
    } else {
      console.log(
        "ℹ️ [callback] no token field from backend; client must handle manually"
      );
    }

    console.log("✅ [/api/auth/google/callback] success, returning JSON to client");
    return resp;
  } catch (e: any) {
    console.error("❌ [/api/auth/google/callback] unexpected error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Auth failed" },
      { status: 500 }
    );
  }
}