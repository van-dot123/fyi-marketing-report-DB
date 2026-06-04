import {
  ALLOWED_META_PRODUCTS,
  GA4Row,
  JOB_PRODUCTS,
  MetaProduct,
  MetaRow,
  SALARY_PRODUCTS,
  SNSPlatform,
  SNSPost,
  WeeklyMeta,
  WoWResult,
  campaignTypeOf,
} from "@/types";

export const PILLAR_MAP: Record<string, string> = {};

function num(s: string): number {
  return parseFloat(String(s ?? "").replace(/\./g, "").replace(",", ".")) || 0;
}

function isoDate(s: string): string {
  return String(s ?? "").slice(0, 10);
}

export function getISOWeek(date: string): number {
  const d = new Date(`${isoDate(date)}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = Date.UTC(d.getUTCFullYear(), 0, 4);
  return 1 + Math.round((d.getTime() - firstThursday) / 604800000);
}

function pillar(key: string): string {
  return PILLAR_MAP[key] ?? "Uncategorized";
}

export function isSalaryProduct(product: string): boolean {
  return SALARY_PRODUCTS.includes(product as MetaProduct);
}

export function isJobProduct(product: string): boolean {
  return JOB_PRODUCTS.includes(product as MetaProduct);
}

export function parseMetaAds(rows: string[][]): MetaRow[] {
  const headers = rows[0] ?? [];
  const idx = (name: string) => headers.indexOf(name);
  const dayIdx = idx("Day");
  const spendIdx = idx("Amount Spent");
  const productIdx = idx("Product");
  const leadsIdx = idx("Website Lead");
  const clicksIdx = idx("Link Clicks");
  const impressionsIdx = idx("Impressions");
  const ctrIdx = idx("CTR (Link Click-Through Rate)");
  const adNameIdx = idx("Ad Name");
  const campaignIdx = idx("Campaign Name");
  const audienceIdx = idx("Audience");
  const objectiveIdx = idx("MT_Objective");

  const dataRows = rows.slice(1).filter((r) => ALLOWED_META_PRODUCTS.includes(r[productIdx] as MetaProduct));

  return dataRows.map((r) => {
    const date = isoDate(r[dayIdx]);
    const product = r[productIdx] as MetaProduct;
    return {
      date,
      isoWeek: getISOWeek(date),
      product,
      campaignType: campaignTypeOf(product),
      adName: r[adNameIdx] ?? "",
      audience: r[audienceIdx] ?? "",
      spend: num(r[spendIdx]),
      leads: num(r[leadsIdx]),
      clicks: num(r[clicksIdx]),
      impressions: num(r[impressionsIdx]),
    };
  });
}

export function aggregateMetaWeekly(rows: MetaRow[]): WeeklyMeta[] {
  const groups = new Map<string, WeeklyMeta>();
  const audiences = new Map<string, Set<string>>();

  for (const r of rows) {
    const key = `${r.isoWeek}|${r.product}`;
    const g =
      groups.get(key) ??
      {
        isoWeek: r.isoWeek,
        product: r.product,
        campaignType: campaignTypeOf(r.product),
        audience: [],
        spend: 0,
        leads: 0,
        clicks: 0,
        impressions: 0,
        cpl: 0,
        ctr: 0,
      };
    g.spend += r.spend;
    g.leads += r.leads;
    g.clicks += r.clicks;
    g.impressions += r.impressions;
    groups.set(key, g);

    const set = audiences.get(key) ?? new Set<string>();
    if (r.audience) set.add(r.audience);
    audiences.set(key, set);
  }

  return [...groups.entries()].map(([key, g]) => ({
    ...g,
    audience: [...(audiences.get(key) ?? new Set<string>())],
    cpl: g.leads ? g.spend / g.leads : 0,
    ctr: g.impressions ? g.clicks / g.impressions : 0,
  }));
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

// Parse a single platform sheet by header name. Interaction and reach formulas
// differ per platform:
//   facebook  interactions = Reactions + Comments + Shares,           reach = Reach
//   instagram interactions = Likes + Comments + Shares,               reach = Reach
//   threads   interactions = Comments + Reposts + Quotes + Shares,    reach = Views / 2
function parseSnsSheet(rows: string[][], platform: SNSPlatform): SNSPost[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const dateIdx = colIndexAny(headers, ["Date posted", "Date", "Day"]);
  const pillarIdx = colIndex(headers, "Pillar");
  const viewsIdx = colIndex(headers, "Views");
  const reachIdx = colIndex(headers, "Reach");
  const impressionsIdx = colIndex(headers, "Impressions");
  const reactionsIdx = colIndex(headers, "Reactions");
  const likesIdx = colIndex(headers, "Likes");
  const commentsIdx = colIndex(headers, "Comments");
  const sharesIdx = colIndex(headers, "Shares");
  const repostsIdx = colIndex(headers, "Reposts");
  const quotesIdx = colIndex(headers, "Quotes");
  const cell = (r: string[], i: number) => (i >= 0 ? num(r[i]) : 0);

  return rows.slice(1).map((r) => {
    const date = isoDate(dateIdx >= 0 ? r[dateIdx] : r[0]);
    const views = cell(r, viewsIdx);
    const comments = cell(r, commentsIdx);
    const shares = cell(r, sharesIdx);

    let interactions = 0;
    let reach = 0;
    if (platform === "facebook") {
      interactions = cell(r, reactionsIdx) + comments + shares;
      reach = cell(r, reachIdx);
    } else if (platform === "instagram") {
      interactions = cell(r, likesIdx) + comments + shares;
      reach = cell(r, reachIdx);
    } else {
      // threads: estimated reach = Views / 2 (frequency assumed = 2).
      interactions = comments + cell(r, repostsIdx) + cell(r, quotesIdx) + shares;
      reach = views / 2;
    }

    return {
      platform,
      date,
      isoWeek: getISOWeek(date),
      pillar: pillar(pillarIdx >= 0 ? r[pillarIdx] : ""),
      views,
      reach,
      impressions: cell(r, impressionsIdx),
      engagement: interactions,
      interactions,
    };
  });
}

export function parseSNS(
  fb: string[][],
  ins: string[][],
  threads: string[][]
): SNSPost[] {
  return [
    ...parseSnsSheet(fb, "facebook"),
    ...parseSnsSheet(ins, "instagram"),
    ...parseSnsSheet(threads, "threads"),
  ];
}

export function parseGA4(rows: string[][]): GA4Row[] {
  const headers = rows[0] ?? [];
  const idx = (name: string) => headers.indexOf(name);
  const dateIdx = idx("Date");
  const cleanedSourceIdx = idx("Cleaned Source");
  const campaignIdx = idx("Campaign");
  const landingPageIdx = idx("Landing Page");
  const sessionsIdx = idx("Sessions");
  const conversionsIdx = idx("Conversions");
  const numCell = (s: string) => parseInt(String(s ?? "").replace(/,/g, "."), 10) || 0;

  return rows.slice(1).map((r) => {
    const date = isoDate(r[dateIdx]);
    return {
      date,
      isoWeek: getISOWeek(date),
      source: r[cleanedSourceIdx] ?? "",
      campaign: r[campaignIdx] ?? "",
      landingPage: r[landingPageIdx] ?? "",
      sessions: numCell(r[sessionsIdx]),
      conversions: numCell(r[conversionsIdx]),
    };
  });
}

export function calcWoW(data: { isoWeek: number; value: number }[]): WoWResult[] {
  const sorted = [...data].sort((a, b) => a.isoWeek - b.isoWeek);

  return sorted.map((d, i) => {
    const previous = i > 0 ? sorted[i - 1].value : 0;
    const pctChange = previous ? (d.value - previous) / previous : 0;
    return {
      isoWeek: d.isoWeek,
      value: d.value,
      previous,
      pctChange,
      flag: Math.abs(pctChange) > 0.15,
    };
  });
}
