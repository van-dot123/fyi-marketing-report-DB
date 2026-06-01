import {
  ALLOWED_META_PRODUCTS,
  GA4Row,
  MetaProduct,
  MetaRow,
  SNSPlatform,
  SNSPost,
  WeeklyMeta,
  WoWResult,
} from "@/types";

const META_COLS = {
  date: 3,
  product: 18,
  ad_name: 2,
  impressions: 5,
  spend: 9,
  clicks: 11,
  leads: 14,
  audience: 22,
};

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

export function parseMetaAds(rows: string[][]): MetaRow[] {
  return rows
    .filter((r) =>
      ALLOWED_META_PRODUCTS.includes(r[META_COLS.product] as MetaProduct)
    )
    .map((r) => {
      const date = isoDate(r[META_COLS.date]);
      return {
        date,
        isoWeek: getISOWeek(date),
        product: r[META_COLS.product] as MetaProduct,
        spend: num(r[META_COLS.spend]),
        leads: num(r[META_COLS.leads]),
        clicks: num(r[META_COLS.clicks]),
        impressions: num(r[META_COLS.impressions]),
      };
    });
}

export function aggregateMetaWeekly(rows: MetaRow[]): WeeklyMeta[] {
  const groups = new Map<string, WeeklyMeta>();

  for (const r of rows) {
    const key = `${r.isoWeek}|${r.product}`;
    const g =
      groups.get(key) ??
      {
        isoWeek: r.isoWeek,
        product: r.product,
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
  }

  return [...groups.values()].map((g) => ({
    ...g,
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
