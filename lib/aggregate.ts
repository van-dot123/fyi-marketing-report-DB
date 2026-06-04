import { Unit } from "@/lib/format";
import { Ga4Day, MetaDay, SnsPlatform, SnsPostRow } from "@/lib/realData";

export const PRODUCT_COLORS: Record<string, string> = {
  April: "#7c3aed",
  "K-Tuvi": "#2563eb",
  "Job-page": "#06b6d4",
};

export const PLATFORM_COLORS: Record<SnsPlatform, string> = {
  Facebook: "#2563eb",
  Instagram: "#db2777",
  Threads: "#0f172a",
};

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

const weekNum = (w: string) => parseInt(w.slice(1), 10) || 0;

function sortedWeeks(items: { week: string }[]): string[] {
  return [...new Set(items.map((i) => i.week))].sort(
    (a, b) => weekNum(a) - weekNum(b)
  );
}

export function inRange<T extends { date: string }>(
  items: T[],
  start: string,
  end: string
): T[] {
  return items.filter((i) => i.date >= start && i.date <= end);
}

export interface Metric {
  key: string;
  label: string;
  value: number;
  unit: Unit;
  series: number[];
  note?: string;
}

export function paidMetrics(days: MetaDay[]): Metric[] {
  const weeks = sortedWeeks(days);
  const per = weeks.map((w) => {
    const rs = days.filter((d) => d.week === w);
    return {
      spend: sum(rs.map((r) => r.spend)),
      leads: sum(rs.map((r) => r.leads)),
      clicks: sum(rs.map((r) => r.clicks)),
      impressions: sum(rs.map((r) => r.impressions)),
    };
  });
  const spend = sum(per.map((p) => p.spend));
  const leads = sum(per.map((p) => p.leads));
  const clicks = sum(per.map((p) => p.clicks));
  const impr = sum(per.map((p) => p.impressions));

  return [
    { key: "spend", label: "Total Spend", value: spend, unit: "currency", series: per.map((p) => p.spend) },
    { key: "leads", label: "Leads", value: leads, unit: "number", series: per.map((p) => p.leads) },
    { key: "cpl", label: "CPL", value: leads ? Math.round(spend / leads) : 0, unit: "currency", series: per.map((p) => (p.leads ? Math.round(p.spend / p.leads) : 0)) },
    { key: "ctr", label: "CTR", value: impr ? clicks / impr : 0, unit: "percent", series: per.map((p) => (p.impressions ? p.clicks / p.impressions : 0)) },
  ];
}

export interface MetaWeek {
  week: string;
  spend: number;
  leads: number;
  cpl: number;
}

export function metaWeekly(days: MetaDay[]): MetaWeek[] {
  return sortedWeeks(days).map((week) => {
    const rs = days.filter((d) => d.week === week);
    const spend = sum(rs.map((r) => r.spend));
    const leads = sum(rs.map((r) => r.leads));
    return { week, spend, leads, cpl: leads ? Math.round(spend / leads) : 0 };
  });
}

export function metaTotals(days: MetaDay[]): Record<string, number> {
  const spend = sum(days.map((d) => d.spend));
  const leads = sum(days.map((d) => d.leads));
  const clicks = sum(days.map((d) => d.clicks));
  const impr = sum(days.map((d) => d.impressions));
  const reach = sum(days.map((d) => d.reach));
  return {
    spend,
    leads,
    reach,
    cpl: leads ? Math.round(spend / leads) : 0,
    ctr: impr ? clicks / impr : 0,
  };
}

export function trafficTotals(ga4: Ga4Day[]): Record<string, number> {
  const total = sum(ga4.map((d) => d.sessions));
  const paid = sum(ga4.filter((d) => d.channel === "paid").map((d) => d.sessions));
  const organic = sum(ga4.filter((d) => d.channel === "organic").map((d) => d.sessions));
  return { total, paid, organic, other: total - paid - organic };
}

export function snsTotals(
  posts: SnsPostRow[],
  tab: PlatformTab
): Record<string, number> {
  const subset = platformPosts(posts, tab);
  const views = sum(subset.map((p) => p.views));
  const interactions = sum(subset.map((p) => p.interactions));
  const reach = sum(subset.map((p) => p.reach));
  // ER = Total Interactions / Total Reach (rendered as a percentage).
  return { views, interactions, reach, er: reach ? interactions / reach : 0 };
}

export function paidProducts(days: MetaDay[]): string[] {
  return [...new Set(days.map((d) => d.product).filter(Boolean))];
}

type Pivot = Record<string, number | string>;

export function paidPivot(days: MetaDay[], metric: "spend" | "cpl"): Pivot[] {
  const products = paidProducts(days);
  return sortedWeeks(days).map((week) => {
    const row: Pivot = { week };
    for (const p of products) {
      const rs = days.filter((d) => d.week === week && d.product === p);
      const spend = sum(rs.map((r) => r.spend));
      const leads = sum(rs.map((r) => r.leads));
      row[p] = metric === "spend" ? spend : leads ? Math.round(spend / leads) : 0;
    }
    return row;
  });
}

export interface Creative {
  adName: string;
  product: string;
  audience: string;
  spend: number;
  leads: number;
  cpl: number;
  ctr: number;
}

export function paidCreatives(days: MetaDay[]): Creative[] {
  const map = new Map<
    string,
    { product: string; audience: string; spend: number; leads: number; clicks: number; impressions: number }
  >();
  for (const d of days) {
    const key = d.adName || "(unnamed)";
    const c =
      map.get(key) ??
      { product: d.product, audience: d.audience, spend: 0, leads: 0, clicks: 0, impressions: 0 };
    c.spend += d.spend;
    c.leads += d.leads;
    c.clicks += d.clicks;
    c.impressions += d.impressions;
    map.set(key, c);
  }
  return [...map.entries()]
    .map(([adName, c]) => ({
      adName,
      product: c.product,
      audience: c.audience,
      spend: c.spend,
      leads: c.leads,
      cpl: c.leads ? Math.round(c.spend / c.leads) : 0,
      ctr: c.impressions ? c.clicks / c.impressions : 0,
    }))
    .sort((a, b) => b.leads - a.leads);
}

export type Campaign = "All" | "Salary Page" | "Job Page";

const SALARY_PRODUCTS = ["April"];
const JOB_PRODUCTS = ["K-Tuvi", "Job-page"];

export function campaignProducts(c: Campaign): string[] {
  if (c === "Salary Page") return SALARY_PRODUCTS;
  if (c === "Job Page") return JOB_PRODUCTS;
  return [...SALARY_PRODUCTS, ...JOB_PRODUCTS];
}

export function filterByCampaign(days: MetaDay[], c: Campaign): MetaDay[] {
  if (c === "All") return days;
  const products = campaignProducts(c);
  return days.filter((d) => products.includes(d.product));
}

export function ga4PaidByDate(ga4: Ga4Day[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of ga4) {
    if (d.channel !== "paid") continue;
    m.set(d.date, (m.get(d.date) ?? 0) + d.sessions);
  }
  return m;
}

export interface PaidCreativeRow {
  adName: string;
  product: string;
  audience: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  sessions: number;
  cpl: number;
  ctr: number;
}

export function creativesWithSessions(days: MetaDay[], ga4: Ga4Day[]): PaidCreativeRow[] {
  const paidByDate = ga4PaidByDate(ga4);
  const clicksByDate = new Map<string, number>();
  for (const d of days) clicksByDate.set(d.date, (clicksByDate.get(d.date) ?? 0) + d.clicks);

  const map = new Map<
    string,
    { product: string; audience: string; spend: number; leads: number; clicks: number; impressions: number; sessions: number }
  >();
  for (const d of days) {
    const key = d.adName || "(unnamed)";
    const c =
      map.get(key) ??
      { product: d.product, audience: d.audience, spend: 0, leads: 0, clicks: 0, impressions: 0, sessions: 0 };
    c.spend += d.spend;
    c.leads += d.leads;
    c.clicks += d.clicks;
    c.impressions += d.impressions;
    const dayClicks = clicksByDate.get(d.date) ?? 0;
    const daySessions = paidByDate.get(d.date) ?? 0;
    c.sessions += dayClicks ? (d.clicks / dayClicks) * daySessions : 0;
    map.set(key, c);
  }

  return [...map.entries()]
    .map(([adName, c]) => ({
      adName,
      product: c.product,
      audience: c.audience,
      spend: c.spend,
      leads: c.leads,
      clicks: c.clicks,
      impressions: c.impressions,
      sessions: Math.round(c.sessions),
      cpl: c.leads ? Math.round(c.spend / c.leads) : 0,
      ctr: c.impressions ? c.clicks / c.impressions : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

export interface TrafficWeek {
  week: string;
  total: number;
  paid: number;
  organic: number;
  other: number;
}

export function trafficWeekly(ga4: Ga4Day[]): TrafficWeek[] {
  return sortedWeeks(ga4).map((week) => {
    const rs = ga4.filter((d) => d.week === week);
    const total = sum(rs.map((r) => r.sessions));
    const paid = sum(rs.filter((r) => r.channel === "paid").map((r) => r.sessions));
    const organic = sum(rs.filter((r) => r.channel === "organic").map((r) => r.sessions));
    return { week, total, paid, organic, other: total - paid - organic };
  });
}

export interface FunnelWeek {
  week: string;
  weekStart: string;
  weekEnd: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  sessions: number;
  conversions: number;
}

// Monday→Sunday ISO date range (YYYY-MM-DD) for the ISO week containing `date`.
function isoWeekRange(date: string): [string, string] {
  if (!date) return ["", ""];
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - dow);
  const monday = new Date(d);
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() + 6);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return [iso(monday), iso(sunday)];
}

export function funnelWeekly(meta: MetaDay[], ga4: Ga4Day[]): FunnelWeek[] {
  const all = [...meta, ...ga4];
  const weeks = sortedWeeks(all);
  // Earliest observed date per week → used to resolve the calendar range.
  const repDate = new Map<string, string>();
  for (const r of all) {
    const cur = repDate.get(r.week);
    if (!cur || r.date < cur) repDate.set(r.week, r.date);
  }
  return weeks.map((week) => {
    const m = meta.filter((d) => d.week === week);
    const g = ga4.filter((d) => d.week === week);
    const [weekStart, weekEnd] = isoWeekRange(repDate.get(week) ?? "");
    return {
      week,
      weekStart,
      weekEnd,
      spend: sum(m.map((r) => r.spend)),
      reach: sum(m.map((r) => r.reach)),
      impressions: sum(m.map((r) => r.impressions)),
      clicks: sum(m.map((r) => r.clicks)),
      sessions: sum(g.map((r) => r.sessions)),
      conversions: sum(g.map((r) => r.conversions)),
    };
  });
}

export type PlatformTab = "All" | SnsPlatform;

function platformPosts(posts: SnsPostRow[], tab: PlatformTab): SnsPostRow[] {
  return tab === "All" ? posts : posts.filter((p) => p.platform === tab);
}

export interface SnsWeek {
  week: string;
  views: number;
  interactions: number;
  reach: number;
}

export function snsWeekly(posts: SnsPostRow[], tab: PlatformTab): SnsWeek[] {
  const subset = platformPosts(posts, tab);
  return sortedWeeks(subset).map((week) => {
    const rs = subset.filter((p) => p.week === week);
    return {
      week,
      views: sum(rs.map((p) => p.views)),
      interactions: sum(rs.map((p) => p.interactions)),
      reach: sum(rs.map((p) => p.reach)),
    };
  });
}

const THREADS_REACH_NOTE = "Threads reach is estimated (Views ÷ 2, assuming frequency = 2)";

export function snsMetrics(posts: SnsPostRow[], tab: PlatformTab): Metric[] {
  const subset = platformPosts(posts, tab);
  const weeks = snsWeekly(posts, tab);
  const views = sum(subset.map((p) => p.views));
  const interactions = sum(subset.map((p) => p.interactions));
  const reach = sum(subset.map((p) => p.reach));
  // ER = Total Interactions / Total Reach (rendered as a percentage).
  const er = reach ? interactions / reach : 0;

  return [
    { key: "views", label: "Views", value: views, unit: "number", series: weeks.map((w) => w.views) },
    { key: "interactions", label: "Interactions", value: interactions, unit: "number", series: weeks.map((w) => w.interactions) },
    { key: "reach", label: "Reach", value: Math.round(reach), unit: "number", series: weeks.map((w) => w.reach), note: tab === "All" || tab === "Threads" ? THREADS_REACH_NOTE : undefined },
    { key: "er", label: "ER%", value: er, unit: "percent", series: weeks.map((w) => (w.reach ? w.interactions / w.reach : 0)) },
  ];
}

export function snsPlatforms(posts: SnsPostRow[]): SnsPlatform[] {
  return [...new Set(posts.map((p) => p.platform))];
}

export function snsPillars(posts: SnsPostRow[]): string[] {
  return [...new Set(posts.map((p) => p.pillar))];
}

export function pillarHeatmap(
  posts: SnsPostRow[]
): { pillars: string[]; platforms: SnsPlatform[]; value: (pillar: string, platform: SnsPlatform) => number; max: number } {
  const pillars = snsPillars(posts);
  const platforms = snsPlatforms(posts);
  const value = (pillar: string, platform: SnsPlatform) =>
    sum(posts.filter((p) => p.pillar === pillar && p.platform === platform).map((p) => p.views));
  let max = 0;
  for (const pl of pillars)
    for (const pf of platforms) max = Math.max(max, value(pl, pf));
  return { pillars, platforms, value, max: max || 1 };
}
