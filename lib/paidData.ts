import { MetricSummary } from "@/lib/mockData";

export const PRODUCTS = ["April", "K-Tuvi", "Job-page"] as const;
export type Product = (typeof PRODUCTS)[number];

export const PRODUCT_COLORS: Record<Product, string> = {
  April: "#7c3aed",
  "K-Tuvi": "#2563eb",
  "Job-page": "#06b6d4",
};

export interface PaidRow {
  week: string;
  product: Product;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
}

export const paidRows: PaidRow[] = [
  { week: "W18", product: "April", spend: 55000, leads: 130, clicks: 2100, impressions: 90000 },
  { week: "W18", product: "K-Tuvi", spend: 40000, leads: 90, clicks: 1500, impressions: 70000 },
  { week: "W18", product: "Job-page", spend: 25000, leads: 60, clicks: 900, impressions: 50000 },
  { week: "W19", product: "April", spend: 62000, leads: 140, clicks: 2300, impressions: 95000 },
  { week: "W19", product: "K-Tuvi", spend: 48000, leads: 100, clicks: 1700, impressions: 78000 },
  { week: "W19", product: "Job-page", spend: 35000, leads: 80, clicks: 1200, impressions: 60000 },
  { week: "W20", product: "April", spend: 70000, leads: 170, clicks: 2600, impressions: 102000 },
  { week: "W20", product: "K-Tuvi", spend: 50000, leads: 120, clicks: 1900, impressions: 82000 },
  { week: "W20", product: "Job-page", spend: 40000, leads: 120, clicks: 1500, impressions: 68000 },
  { week: "W21", product: "April", spend: 78000, leads: 210, clicks: 3000, impressions: 110000 },
  { week: "W21", product: "K-Tuvi", spend: 55000, leads: 160, clicks: 2200, impressions: 90000 },
  { week: "W21", product: "Job-page", spend: 42000, leads: 150, clicks: 1700, impressions: 72000 },
  { week: "W22", product: "April", spend: 70000, leads: 200, clicks: 2800, impressions: 105000 },
  { week: "W22", product: "K-Tuvi", spend: 50000, leads: 150, clicks: 2000, impressions: 85000 },
  { week: "W22", product: "Job-page", spend: 35000, leads: 130, clicks: 1500, impressions: 66000 },
];

type Pivot = Record<string, number | string>;

function weekOrder(rows: PaidRow[]): string[] {
  return [...new Set(rows.map((r) => r.week))];
}

function pivot(rows: PaidRow[], value: (rs: PaidRow[]) => number): Pivot[] {
  return weekOrder(rows).map((week) => {
    const row: Pivot = { week };
    for (const p of PRODUCTS) {
      row[p] = value(rows.filter((r) => r.week === week && r.product === p));
    }
    return row;
  });
}

export function spendByWeek(rows: PaidRow[]): Pivot[] {
  return pivot(rows, (rs) => rs.reduce((s, r) => s + r.spend, 0));
}

export function cplByWeek(rows: PaidRow[]): Pivot[] {
  return pivot(rows, (rs) => {
    const spend = rs.reduce((s, r) => s + r.spend, 0);
    const leads = rs.reduce((s, r) => s + r.leads, 0);
    return leads ? Math.round(spend / leads) : 0;
  });
}

export function paidMetrics(rows: PaidRow[]): MetricSummary[] {
  const perWeek = weekOrder(rows).map((week) => {
    const rs = rows.filter((r) => r.week === week);
    return {
      spend: rs.reduce((s, r) => s + r.spend, 0),
      leads: rs.reduce((s, r) => s + r.leads, 0),
      clicks: rs.reduce((s, r) => s + r.clicks, 0),
      impressions: rs.reduce((s, r) => s + r.impressions, 0),
    };
  });

  const spend = perWeek.reduce((s, w) => s + w.spend, 0);
  const leads = perWeek.reduce((s, w) => s + w.leads, 0);
  const clicks = perWeek.reduce((s, w) => s + w.clicks, 0);
  const impressions = perWeek.reduce((s, w) => s + w.impressions, 0);

  return [
    { key: "spend", label: "Total Spend", value: spend, unit: "currency", series: perWeek.map((w) => w.spend) },
    { key: "leads", label: "Leads", value: leads, unit: "number", series: perWeek.map((w) => w.leads) },
    {
      key: "cpl",
      label: "CPL",
      value: leads ? Math.round(spend / leads) : 0,
      unit: "currency",
      series: perWeek.map((w) => (w.leads ? Math.round(w.spend / w.leads) : 0)),
    },
    {
      key: "ctr",
      label: "CTR",
      value: impressions ? clicks / impressions : 0,
      unit: "percent",
      series: perWeek.map((w) => (w.impressions ? w.clicks / w.impressions : 0)),
    },
  ];
}

export interface PaidCreative {
  rank: number;
  adName: string;
  product: Product;
  audience: string;
  spend: number;
  leads: number;
  cpl: number;
  ctr: number;
}

export const paidCreatives: PaidCreative[] = [
  { rank: 1, adName: "underpaid-hook-v3", product: "Job-page", audience: "Lookalike 1%", spend: 42000, leads: 150, cpl: 280, ctr: 0.0236 },
  { rank: 2, adName: "static-insight-04", product: "April", audience: "Interest: Astrology", spend: 78000, leads: 210, cpl: 371, ctr: 0.0273 },
  { rank: 3, adName: "high-salary-carousel", product: "Job-page", audience: "Retargeting 30d", spend: 40000, leads: 120, cpl: 333, ctr: 0.0221 },
  { rank: 4, adName: "daily-tuvi-reel", product: "K-Tuvi", audience: "Broad VN 22-35", spend: 55000, leads: 160, cpl: 344, ctr: 0.0244 },
  { rank: 5, adName: "april-lunar-story", product: "April", audience: "Lookalike 3%", spend: 62000, leads: 140, cpl: 443, ctr: 0.0242 },
  { rank: 6, adName: "jobs-now-banner", product: "Job-page", audience: "Interest: Hiring", spend: 35000, leads: 80, cpl: 438, ctr: 0.02 },
];
