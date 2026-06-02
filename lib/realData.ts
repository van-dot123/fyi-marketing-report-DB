import { getSheetData } from "@/lib/sheets";
import { dayOf, intNum, parseMetaNum, weekLabel } from "@/lib/normalize";

async function safe(tab: string): Promise<string[][]> {
  try {
    return await getSheetData(tab);
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

export async function getMetaDays(): Promise<MetaDay[]> {
  const rows = await safe("meta_ad_raw_data");
  return rows
    .filter((r) => String(r[0] ?? "").toUpperCase().includes("FYI"))
    .map((r) => {
      const date = dayOf(r[3]);
      return {
        date,
        week: weekLabel(date),
        product: r[18] ?? "",
        adName: r[2] ?? "",
        audience: r[22] ?? "",
        spend: parseMetaNum(r[9]),
        leads: parseMetaNum(r[14]),
        clicks: parseMetaNum(r[11]),
        impressions: parseMetaNum(r[5]),
      };
    })
    .filter((d) => d.date);
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
  return rows
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
