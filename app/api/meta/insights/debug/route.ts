import { NextResponse } from "next/server";

const ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// Hit Meta API with hardcoded last_7d to verify credentials and field syntax
// independently of the UI. Visit /api/meta/insights/debug to check.
export async function GET() {
  if (!ACCOUNT_ID || !ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "META_AD_ACCOUNT_ID or META_ACCESS_TOKEN not configured" },
      { status: 500 }
    );
  }

  const FIELDS =
    "ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,actions,cost_per_action_type";

  const qs = [
    `fields=${encodeURIComponent(FIELDS)}`,
    `level=ad`,
    `date_preset=last_7d`,
    `limit=5`,
    `access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
  ].join("&");

  const url = `https://graph.facebook.com/v19.0/${ACCOUNT_ID}/insights?${qs}`;

  const res: Response = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));

  console.log("[meta/insights/debug] status:", res.status, JSON.stringify(body).slice(0, 500));

  return NextResponse.json(
    { status: res.status, ok: res.ok, body },
    { status: 200 }
  );
}
