import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adIds = searchParams.get("adIds");

  if (!adIds) return NextResponse.json({});
  if (!ACCESS_TOKEN) {
    return NextResponse.json({ error: "META_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    ids: adIds,
    fields: "creative{thumbnail_url,image_url}",
    access_token: ACCESS_TOKEN,
  });

  const url = `https://graph.facebook.com/v19.0?${params}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const json = await res.json();
  const result: Record<string, { thumbnail_url?: string; image_url?: string }> = {};

  for (const [adId, data] of Object.entries(json)) {
    const creative = (data as any)?.creative;
    result[adId] = {
      thumbnail_url: creative?.thumbnail_url ?? undefined,
      image_url: creative?.image_url ?? undefined,
    };
  }

  return NextResponse.json(result);
}
