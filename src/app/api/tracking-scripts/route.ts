// src/app/api/tracking-scripts/route.ts
import { NextResponse } from 'next/server';

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '';

const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/$/, '') : null;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  // ถ้าไม่มี API_BASE ให้คืนเปล่า ๆ เลย กันวนลูป
  if (!API_BASE) {
    console.warn('[tracking-scripts] API_BASE is missing, return empty items');
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('storeId');

  const url = `${API_BASE}/api/tracking-scripts${
    storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
  }`;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });

    if (!res.ok) {
      console.error(
        `❌ tracking-scripts upstream error: ${res.status} ${res.statusText}`
      );
      return NextResponse.json(
        { error: `Upstream error: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (Array.isArray(data?.items)) {
      data.items = data.items.filter((it: any) => {
        const sc = (it?.script || '').toLowerCase();
        if (
          sc.includes('accounts.google.com/gsi') ||
          sc.includes('google.accounts.id')
        ) {
          console.warn('🚫 Blocked GSI script from tracking-scripts:', it?.id);
          return false;
        }
        return true;
      });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('❌ tracking-scripts fetch failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch tracking' },
      { status: 502 }
    );
  }
}