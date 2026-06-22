import { NextRequest, NextResponse } from "next/server";

const ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// Campaign name: FYI_{Product}_{Objective}_{StartDate}_{BudgetType}
function parseCampaign(campaignName: string): { product: string; objective: string } {
  const parts = campaignName.split("_");
  return {
    product: parts[1] ?? "unknown",
    objective: parts[2] ?? "unknown",
  };
}

// Adset name: {Audience}_{Age}_{Gender}_{Location}
// e.g. "dir:mass_a:2235_g:all_loc:hcm-hn"
function parseAdset(adsetName: string): {
  audience: string;
  age: string;
  gender: string;
  location: string;
} {
  return {
    audience: adsetName.match(/^([^_]+)/)?.[1] ?? adsetName,
    age: adsetName.match(/a:(\d+)/)?.[1] ?? "",
    gender: adsetName.match(/g:(\w+)/)?.[1] ?? "",
    location: adsetName.match(/loc:([\w-]+)/)?.[1] ?? "",
  };
}

function parseLeads(actions: { action_type: string; value: string }[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const a = actions.find((a) => a.action_type === "lead");
  return a ? Number(a.value) : 0;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params are required" }, { status: 400 });
  }
  if (!ACCOUNT_ID || !ACCESS_TOKEN) {
    return NextResponse.json({ error: "META_AD_ACCOUNT_ID or META_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  const FIELDS =
    "ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,actions,cost_per_action_type";

  // Build the query string manually so time_range JSON is NOT double-encoded
  // by URLSearchParams. Meta requires it as a literal JSON value in the URL.
  const qs = [
    `fields=${encodeURIComponent(FIELDS)}`,
    `level=ad`,
    `time_increment=1`,
    `time_range=${encodeURIComponent(JSON.stringify({ since: from, until: to }))}`,
    `limit=500`,
    `access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
  ].join("&");

  const baseUrl = `https://graph.facebook.com/v19.0/${ACCOUNT_ID}/insights?${qs}`;
  const rows: any[] = [];
  let nextUrl: string | null = baseUrl;
  let page = 0;
  const MAX_PAGES = 20;

  while (nextUrl) {
    if (page >= MAX_PAGES) {
      console.warn(`[meta/insights] reached ${MAX_PAGES} page limit, stopping pagination`);
      break;
    }
    page++;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(nextUrl, { cache: "no-store", signal: controller.signal });
    } catch (err: any) {
      console.error("[meta/insights] fetch error:", err?.message ?? err);
      return NextResponse.json({ error: err?.message ?? "fetch failed" }, { status: 500 });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[meta/insights] API error:", JSON.stringify(err));
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const json = await res.json();

    if (json.error) {
      console.error("[meta/insights] API returned error in body:", JSON.stringify(json.error));
      return NextResponse.json({ error: json.error }, { status: 400 });
    }

    if (Array.isArray(json.data)) rows.push(...json.data);
    nextUrl = json.paging?.next ?? null;
  }

  const result = rows.map((r: any) => {
    const spend = Number(r.spend ?? 0);
    const leads = parseLeads(r.actions ?? []);
    const clicks = Number(r.clicks ?? 0);
    const impressions = Number(r.impressions ?? 0);
    // Meta returns ctr as percent string e.g. "2.54" meaning 2.54%; normalise to 0..1
    const ctr = Number(r.ctr ?? 0) / 100;
    const cpl = leads > 0 ? spend / leads : null;

    const { product, objective } = parseCampaign(r.campaign_name ?? "");
    const { audience, age, gender, location } = parseAdset(r.adset_name ?? "");

    return {
      date: r.date_start as string,
      ad_id: r.ad_id as string,
      ad_name: ((r.ad_name as string) ?? "").trim(),
      product,
      objective,
      audience,
      age,
      gender,
      location,
      spend,
      impressions,
      clicks,
      ctr,
      leads,
      cpl,
    };
  });

  return NextResponse.json(result);
}
