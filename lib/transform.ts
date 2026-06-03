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

const SNS_COLS = {
  facebook: { date: 0, pillar: 1, reach: 2, impressions: 3, engagement: 4 },
  instagram: { date: 0, pillar: 1, reach: 2, impressions: 3, engagement: 4 },
  threads: { date: 0, pillar: 1, views: 2, impressions: 3, engagement: 4 },
};

const GA4_COLS = { date: 0, source: 2, sessions: 4, conversions: 10 };

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
  console.log("[parseMetaAds] headers:", headers);
  console.log(`[parseMetaAds] idx Day=${dayIdx} Spend=${spendIdx} Product=${productIdx} Leads=${leadsIdx} Clicks=${clicksIdx} Impr=${impressionsIdx} CTR=${ctrIdx} Campaign=${campaignIdx} Audience=${audienceIdx} Objective=${objectiveIdx}`);
  console.log(`[parseMetaAds] matched ${dataRows.length} rows, total spend = ${dataRows.reduce((s, r) => s + num(r[spendIdx]), 0)}`);

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

export function parseSNS(
  fb: string[][],
  ins: string[][],
  threads: string[][]
): SNSPost[] {
  const fromRows = (
    rows: string[][],
    platform: SNSPlatform,
    cols: { date: number; pillar: number; impressions: number; engagement: number }
  ): SNSPost[] =>
    rows.map((r) => {
      const date = isoDate(r[cols.date]);
      return {
        platform,
        date,
        isoWeek: getISOWeek(date),
        pillar: pillar(r[cols.pillar]),
        reach: num(
          r[
            platform === "threads" ? SNS_COLS.threads.views : SNS_COLS[platform].reach
          ]
        ),
        impressions: num(r[cols.impressions]),
        engagement: num(r[cols.engagement]),
      };
    });

  return [
    ...fromRows(fb, "facebook", SNS_COLS.facebook),
    ...fromRows(ins, "instagram", SNS_COLS.instagram),
    ...fromRows(threads, "threads", SNS_COLS.threads),
  ];
}

export function parseGA4(rows: string[][]): GA4Row[] {
  return rows.map((r) => {
    const date = isoDate(r[GA4_COLS.date]);
    return {
      date,
      isoWeek: getISOWeek(date),
      source: r[GA4_COLS.source] ?? "",
      sessions: num(r[GA4_COLS.sessions]),
      conversions: num(r[GA4_COLS.conversions]),
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
