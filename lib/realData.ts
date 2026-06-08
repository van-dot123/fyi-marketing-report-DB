import { getSheetData } from "@/lib/sheets";
import { dayOf, intNum, parseMetaNum, weekLabel } from "@/lib/normalize";

async function safe(tab: string): Promise<string[][]> {
  try {
    return await getSheetData(tab);
  } catch {
    return [];
  }
}

async function safeRaw(tab: string): Promise<string[][]> {
  try {
    return await getSheetData(tab, true);
  } catch {
    return [];
  }
}

export interface MetaDay {
  date: string;
  week: string;
  product: string;
  adName: string;
  audience: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
}

const META_PRODUCTS = ["April", "Job-page", "K-Tuvi"];

export async function getMetaDays(): Promise<MetaDay[]> {
  const rows = await safeRaw("meta_ad_raw_data");
  if (rows.length === 0) return [];
  const headers = rows[0];
  const idx = (name: string) => headers.indexOf(name);
  const dayIdx = idx("Day");
  const spendIdx = idx("Amount Spent");
  const productIdx = idx("Product");
  const leadsIdx = idx("Website Lead");
  const clicksIdx = idx("Link Clicks");
  const impressionsIdx = idx("Impressions");
  const adNameIdx = idx("Ad Name");
  const audienceIdx = idx("Audience");
  const campaignIdx = idx("Campaign Name");

  const productFromCampaign = (campaign: string): string => {
    if (campaign.includes("April")) return "April";
    if (campaign.includes("Job-page")) return "Job-page";
    if (campaign.includes("K-Tuvi")) return "K-Tuvi";
    return "";
  };

  const result = rows
    .slice(1)
    .filter((r) => {
      const campaign = String(r[campaignIdx] ?? "");
      const product = r[productIdx];
      return campaign.includes("FYI") || (productIdx >= 0 && META_PRODUCTS.includes(product));
    })
    .map((r) => {
      const date = dayOf(r[dayIdx]);
      const campaign = String(r[campaignIdx] ?? "");
      const product = (r[productIdx] ?? "") || productFromCampaign(campaign);
      return {
        date,
        week: weekLabel(date),
        product,
        adName: r[adNameIdx] ?? "",
        audience: r[audienceIdx] ?? "",
        spend: parseMetaNum(r[spendIdx]),
        leads: parseMetaNum(r[leadsIdx]),
        clicks: parseMetaNum(r[clicksIdx]),
        impressions: parseMetaNum(r[impressionsIdx]),
      };
    })
    .filter((d) => d.date);
  const lastDate = result.reduce((m, d) => (d.date > m ? d.date : m), "");
  console.log(`[sheets] meta_ad_raw_data: ${result.length} rows, last date ${lastDate || "n/a"}`);
  return result;
}

export type Ga4Channel = "paid" | "organic" | "other";

export interface Ga4Day {
  date: string;
  week: string;
  channel: Ga4Channel;
  source: string;
  campaign: string;
  landingPage: string;
  sessions: number;
  conversions: number;
}

const ORGANIC_SOURCES = new Set(["facebook", "instagram", "threads"]);

export async function getGa4Days(): Promise<Ga4Day[]> {
  const rows = await safeRaw("GA4_raw_data");
  if (rows.length === 0) return [];
  const headers = rows[0];
  const idx = (name: string) => headers.indexOf(name);
  const dateIdx = idx("Date");
  const cleanedSourceIdx = idx("Cleaned Source");
  const campaignIdx = idx("Campaign");
  const landingPageIdx = idx("Landing Page");
  const sessionsIdx = idx("Sessions");
  const conversionsIdx = idx("Conversions");
  const numCell = (s: string) => parseInt(String(s ?? "").replace(/,/g, "."), 10) || 0;

  const result = rows
    .slice(1)
    .map((r) => {
      const date = dayOf(r[dateIdx]);
      const src = String(r[cleanedSourceIdx] ?? "").toLowerCase();
      const channel: Ga4Channel =
        src === "meta" ? "paid" : ORGANIC_SOURCES.has(src) ? "organic" : "other";
      return {
        date,
        week: weekLabel(date),
        channel,
        source: src,
        campaign: String(r[campaignIdx] ?? ""),
        landingPage: String(r[landingPageIdx] ?? ""),
        sessions: numCell(r[sessionsIdx]),
        conversions: numCell(r[conversionsIdx]),
      };
    })
    .filter((d) => d.date);
  const lastDate = result.reduce((m, d) => (d.date > m ? d.date : m), "");
  console.log(`[sheets] GA4_raw_data: ${result.length} rows, last date ${lastDate || "n/a"}`);
  return result;
}

export type SnsPlatform = "Facebook" | "Instagram" | "Threads";

export interface SnsPostRow {
  platform: SnsPlatform;
  date: string;
  week: string;
  pillar: string;
  views: number;
  reach: number;
  interactions: number;
  reactions: number;
  comments: number;
  shares: number;
  url: string;
}

function colIndex(headers: string[], name: string): number {
  const lc = name.trim().toLowerCase();
  return (headers ?? []).findIndex((h) => String(h ?? "").trim().toLowerCase() === lc);
}

function mapMeta(r: string[], platform: SnsPlatform, pillarIdx: number): SnsPostRow {
  const date = dayOf(r[0]);
  const interactions = intNum(r[5]);
  const comments = intNum(r[6]);
  const shares = intNum(r[7]);
  return {
    platform,
    date,
    week: weekLabel(date),
    pillar: (pillarIdx >= 0 ? r[pillarIdx] : "") || "Uncategorized",
    views: intNum(r[3]),
    reach: intNum(r[4]),
    interactions,
    reactions: Math.max(0, interactions - comments - shares),
    comments,
    shares,
    url: r[2] ?? "#",
  };
}

function mapThreads(r: string[], pillarIdx: number): SnsPostRow {
  const date = dayOf(r[0]);
  const likes = intNum(r[4]);
  const comments = intNum(r[5]);
  const reposts = intNum(r[6]);
  const quotes = intNum(r[7]);
  const shares = intNum(r[8]);
  const views = intNum(r[3]);
  return {
    platform: "Threads",
    date,
    week: weekLabel(date),
    pillar: (pillarIdx >= 0 ? r[pillarIdx] : "") || "Uncategorized",
    views,
    reach: views,
    interactions: likes + comments + reposts + quotes + shares,
    reactions: likes,
    comments,
    shares: reposts + quotes + shares,
    url: r[2] ?? "#",
  };
}

function lastFollower(rows: string[][]): number {
  if (rows.length < 2) return 0;
  const fIdx = colIndex(rows[0], "follower");
  if (fIdx < 0) return 0;
  for (let i = rows.length - 1; i >= 1; i--) {
    const v = intNum(rows[i][fIdx]);
    if (v > 0) return v;
  }
  return 0;
}

function snsPostsFrom(fb: string[][], ins: string[][], th: string[][]): SnsPostRow[] {
  const pillar = (rows: string[][]) => colIndex(rows[0] ?? [], "Pillar");
  return [
    ...fb.slice(1).map((r) => mapMeta(r, "Facebook", pillar(fb))),
    ...ins.slice(1).map((r) => mapMeta(r, "Instagram", pillar(ins))),
    ...th.slice(1).map((r) => mapThreads(r, pillar(th))),
  ].filter((p) => p.date);
}

export async function getSnsPosts(): Promise<SnsPostRow[]> {
  const [fb, ins, th] = await Promise.all([
    safeRaw("fb_post_metrics"),
    safeRaw("ins_post_metrics"),
    safeRaw("threads_post_metrics"),
  ]);
  return snsPostsFrom(fb, ins, th);
}

export async function getSnsData(): Promise<{ posts: SnsPostRow[]; followers: Record<SnsPlatform, number> }> {
  const [fb, ins, th] = await Promise.all([
    safeRaw("fb_post_metrics"),
    safeRaw("ins_post_metrics"),
    safeRaw("threads_post_metrics"),
  ]);
  return {
    posts: snsPostsFrom(fb, ins, th),
    followers: { Facebook: lastFollower(fb), Instagram: lastFollower(ins), Threads: lastFollower(th) },
  };
}
