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
  reach: number;
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
  const reachIdx = idx("Reach");
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
        reach: reachIdx >= 0 ? parseMetaNum(r[reachIdx]) : 0,
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

function colIndexAny(headers: string[], names: string[]): number {
  for (const n of names) {
    const i = colIndex(headers, n);
    if (i >= 0) return i;
  }
  return -1;
}

// Build SNS post rows from a single platform sheet, reading every column by
// header name (never by position). Interaction and reach formulas differ per
// platform:
//   Facebook  interactions = Reactions + Comments + Shares,  reach = Reach
//   Instagram interactions = Likes + Comments + Shares,       reach = Reach
//   Threads   interactions = Comments + Reposts + Quotes + Shares,
//             reach = Views / 2  (no native reach; frequency assumed = 2)
function snsRowsFrom(rows: string[][], platform: SnsPlatform): SnsPostRow[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const dateIdx = colIndexAny(headers, ["Date posted", "Date", "Day"]);
  const pillarIdx = colIndex(headers, "Pillar");
  const urlIdx = colIndexAny(headers, ["Permalink", "Post URL", "URL", "Link"]);
  const viewsIdx = colIndex(headers, "Views");
  const reachIdx = colIndex(headers, "Reach");
  const reactionsIdx = colIndex(headers, "Reactions");
  const likesIdx = colIndex(headers, "Likes");
  const commentsIdx = colIndex(headers, "Comments");
  const sharesIdx = colIndex(headers, "Shares");
  const repostsIdx = colIndex(headers, "Reposts");
  const quotesIdx = colIndex(headers, "Quotes");
  const cell = (r: string[], i: number) => (i >= 0 ? intNum(r[i]) : 0);

  return rows
    .slice(1)
    .map((r) => {
      const date = dayOf(dateIdx >= 0 ? r[dateIdx] : r[0]);
      const views = cell(r, viewsIdx);
      const comments = cell(r, commentsIdx);
      const shares = cell(r, sharesIdx);

      let reactions = 0;
      let interactions = 0;
      let reach = 0;
      if (platform === "Facebook") {
        reactions = cell(r, reactionsIdx);
        interactions = reactions + comments + shares;
        reach = cell(r, reachIdx);
      } else if (platform === "Instagram") {
        reactions = cell(r, likesIdx);
        interactions = reactions + comments + shares;
        reach = cell(r, reachIdx);
      } else {
        // Threads: estimated reach = Views / 2 (frequency assumed = 2).
        const reposts = cell(r, repostsIdx);
        const quotes = cell(r, quotesIdx);
        reactions = cell(r, likesIdx);
        interactions = comments + reposts + quotes + shares;
        reach = views / 2;
      }

      return {
        platform,
        date,
        week: weekLabel(date),
        pillar: (pillarIdx >= 0 ? r[pillarIdx] : "") || "Uncategorized",
        views,
        reach,
        interactions,
        reactions,
        comments,
        shares,
        url: (urlIdx >= 0 ? r[urlIdx] : r[2]) ?? "#",
      };
    })
    .filter((p) => p.date);
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
  return [
    ...snsRowsFrom(fb, "Facebook"),
    ...snsRowsFrom(ins, "Instagram"),
    ...snsRowsFrom(th, "Threads"),
  ];
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
