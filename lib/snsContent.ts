export type SnsPlatform = "All" | "Facebook" | "Instagram" | "Threads";
export type ContentType = "All" | "Posts" | "Reels";

export const PLATFORM_OPTIONS: SnsPlatform[] = [
  "All",
  "Facebook",
  "Instagram",
  "Threads",
];
export const CONTENT_TYPES: ContentType[] = ["All", "Posts", "Reels"];

export const PLATFORM_COLORS: Record<Exclude<SnsPlatform, "All">, string> = {
  Facebook: "#2563eb",
  Instagram: "#db2777",
  Threads: "#0f172a",
};

const PLATFORM_FACTOR: Record<SnsPlatform, number> = {
  All: 1,
  Facebook: 0.42,
  Instagram: 0.34,
  Threads: 0.24,
};
const CONTENT_FACTOR: Record<ContentType, number> = {
  All: 1,
  Posts: 0.6,
  Reels: 0.4,
};

export interface DailyPoint {
  date: string;
  total: number;
  organic: number;
  ads: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

const RAW_DAILY: DailyPoint[] = Array.from({ length: 29 }, (_, i) => {
  const wave = 1 + Math.sin(i / 3) * 0.18;
  const trend = 1 + i * 0.012;
  const organic = Math.round(2600 * wave * trend);
  const ads = Math.round(1500 * (1.1 - Math.cos(i / 4) * 0.2) * trend);
  return { date: `2026-05-${pad(3 + i)}`, total: organic + ads, organic, ads };
});

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

export function dailyViews(
  platform: SnsPlatform,
  content: ContentType
): DailyPoint[] {
  const f = PLATFORM_FACTOR[platform] * CONTENT_FACTOR[content];
  return RAW_DAILY.map((d) => ({
    date: d.date,
    total: Math.round(d.total * f),
    organic: Math.round(d.organic * f),
    ads: Math.round(d.ads * f),
  }));
}

function wow(values: number[]): number {
  const n = values.length;
  if (n < 14) return 0;
  const last = sum(values.slice(n - 7));
  const prev = sum(values.slice(n - 14, n - 7));
  return prev ? (last - prev) / prev : 0;
}

export type MetricUnit = "number" | "percent";

export interface SnsMetric {
  key: string;
  label: string;
  value: number;
  unit: MetricUnit;
  wow: number;
}

export function snsContentMetrics(
  platform: SnsPlatform,
  content: ContentType
): SnsMetric[] {
  const daily = dailyViews(platform, content);
  const views = sum(daily.map((d) => d.total));
  const viewsWow = wow(daily.map((d) => d.total));
  const interactions = Math.round(views * 0.083);
  const reach = Math.round(views * 0.71);
  const er = views ? interactions / views : 0;
  const sessions = Math.round(views * 0.045);

  return [
    { key: "views", label: "Views", value: views, unit: "number", wow: viewsWow },
    { key: "interactions", label: "Interactions", value: interactions, unit: "number", wow: 0.09 },
    { key: "reach", label: "Reach", value: reach, unit: "number", wow: 0.04 },
    { key: "er", label: "ER%", value: er, unit: "percent", wow: 0.012 },
    { key: "sessions", label: "Sessions", value: sessions, unit: "number", wow: -0.03 },
  ];
}

export interface BreakdownItem {
  label: string;
  value: number;
  wow: number;
}

export interface ViewsBreakdown {
  start: string;
  end: string;
  items: BreakdownItem[];
}

export function viewsBreakdown(
  platform: SnsPlatform,
  content: ContentType
): ViewsBreakdown {
  const daily = dailyViews(platform, content);
  const total = sum(daily.map((d) => d.total));
  const organic = sum(daily.map((d) => d.organic));
  const ads = sum(daily.map((d) => d.ads));

  return {
    start: daily[0].date,
    end: daily[daily.length - 1].date,
    items: [
      { label: "Total views", value: total, wow: wow(daily.map((d) => d.total)) },
      { label: "Organic views", value: organic, wow: wow(daily.map((d) => d.organic)) },
      { label: "Paid views", value: ads, wow: wow(daily.map((d) => d.ads)) },
      { label: "Unique viewers", value: Math.round(total * 0.62), wow: wow(daily.map((d) => d.total)) * 0.9 },
    ],
  };
}

export interface ContentCard {
  id: string;
  platform: Exclude<SnsPlatform, "All">;
  type: Exclude<ContentType, "All">;
  caption: string;
  date: string;
  views: number;
  interactions: number;
  comments: number;
  shares: number;
}

export const contentCards: ContentCard[] = [
  { id: "c1", platform: "Instagram", type: "Reels", caption: "Why your salary feels underpaid — 3 signs the market moved without you", date: "2026-05-21", views: 41200, interactions: 3420, comments: 412, shares: 980 },
  { id: "c2", platform: "Facebook", type: "Posts", caption: "We analysed 1,000 VN job posts. The salary gap by industry will surprise you.", date: "2026-05-18", views: 38800, interactions: 2710, comments: 388, shares: 640 },
  { id: "c3", platform: "Threads", type: "Posts", caption: "Quick tip: negotiate the offer, not the title. Here's the exact script.", date: "2026-05-24", views: 33100, interactions: 3980, comments: 521, shares: 210 },
  { id: "c4", platform: "Facebook", type: "Reels", caption: "Career pivot at 30? This founder did it in 90 days — full breakdown", date: "2026-05-12", views: 30400, interactions: 2190, comments: 244, shares: 530 },
  { id: "c5", platform: "Instagram", type: "Posts", caption: "Office culture red flags 🚩 save this before your next interview", date: "2026-05-27", views: 28700, interactions: 3150, comments: 470, shares: 720 },
  { id: "c6", platform: "Threads", type: "Reels", caption: "K-Tuvi daily reading for the week — what the numbers say about May", date: "2026-05-09", views: 26500, interactions: 4020, comments: 612, shares: 180 },
  { id: "c7", platform: "Instagram", type: "Reels", caption: "5 résumé mistakes recruiters reject in the first 6 seconds", date: "2026-05-15", views: 24900, interactions: 2640, comments: 333, shares: 410 },
  { id: "c8", platform: "Facebook", type: "Posts", caption: "Breaking: new labour data shows hiring up 12% across tech in Q2", date: "2026-05-30", views: 21300, interactions: 1180, comments: 156, shares: 290 },
];
