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

  const result = rows
    .slice(1)
    .filter((r) => productIdx < 0 || META_PRODUCTS.includes(r[productIdx]))
    .map((r) => {
      const date = dayOf(r[dayIdx]);
      return {
        date,
        week: weekLabel(date),
        product: r[productIdx] ?? "",
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
  sessions: number;
  conversions: number;
}

const ORGANIC_SOURCES = new Set(["facebook", "instagram", "threads"]);

export async function getGa4Days(): Promise<Ga4Day[]> {
  const rows = await safe("GA4_raw_data");
  const result = rows
    .map((r) => {
      const date = dayOf(r[0]);
      const src = String(r[2] ?? "").toLowerCase();
      const channel: Ga4Channel =
        src === "meta" ? "paid" : ORGANIC_SOURCES.has(src) ? "organic" : "other";
      return {
        date,
        week: weekLabel(date),
        channel,
        source: src,
        campaign: String(r[3] ?? ""),
        sessions: intNum(r[4]),
        conversions: intNum(r[10]),
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

function mapMeta(r: string[], platform: SnsPlatform): SnsPostRow {
  const date = dayOf(r[0]);
  const interactions = intNum(r[5]);
  const comments = intNum(r[6]);
  const shares = intNum(r[7]);
  return {
    platform,
    date,
    week: weekLabel(date),
    pillar: r[10] || "Uncategorized",
    views: intNum(r[3]),
    reach: intNum(r[4]),
    interactions,
    reactions: Math.max(0, interactions - comments - shares),
    comments,
    shares,
    url: r[2] ?? "#",
  };
}

function mapThreads(r: string[]): SnsPostRow {
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
    pillar: r[10] || "Uncategorized",
    views,
    reach: views,
    interactions: likes + comments + reposts + quotes + shares,
    reactions: likes,
    comments,
    shares: reposts + quotes + shares,
    url: r[2] ?? "#",
  };
}

export async function getSnsPosts(): Promise<SnsPostRow[]> {
  const [fb, ins, th] = await Promise.all([
    safe("fb_post_metrics"),
    safe("ins_post_metrics"),
    safe("threads_post_metrics"),
  ]);
  return [
    ...fb.map((r) => mapMeta(r, "Facebook")),
    ...ins.map((r) => mapMeta(r, "Instagram")),
    ...th.map(mapThreads),
  ].filter((p) => p.date);
}
