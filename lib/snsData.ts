import { MetricSummary } from "@/lib/mockData";

export const SNS_PLATFORMS = ["Threads", "Facebook", "Instagram"] as const;
export type Platform = (typeof SNS_PLATFORMS)[number];
export type PlatformTab = "All" | Platform;

export const PLATFORM_COLORS: Record<Platform, string> = {
  Threads: "#0f172a",
  Facebook: "#2563eb",
  Instagram: "#db2777",
};

export const PILLARS = ["Career", "Salary", "Culture", "Tips", "News"] as const;
export type Pillar = (typeof PILLARS)[number];

export interface ViewsWeek {
  week: string;
  Threads: number;
  Facebook: number;
  Instagram: number;
}

export const viewsByWeek: ViewsWeek[] = [
  { week: "W18", Threads: 12000, Facebook: 18000, Instagram: 15000 },
  { week: "W19", Threads: 14000, Facebook: 17000, Instagram: 16000 },
  { week: "W20", Threads: 19000, Facebook: 20000, Instagram: 21000 },
  { week: "W21", Threads: 23000, Facebook: 22000, Instagram: 25000 },
  { week: "W22", Threads: 20000, Facebook: 19000, Instagram: 23000 },
];

export const pillarHeatmap: Record<Pillar, Record<Platform, number>> = {
  Career: { Threads: 22000, Facebook: 30000, Instagram: 26000 },
  Salary: { Threads: 18000, Facebook: 24000, Instagram: 20000 },
  Culture: { Threads: 12000, Facebook: 14000, Instagram: 19000 },
  Tips: { Threads: 16000, Facebook: 11000, Instagram: 22000 },
  News: { Threads: 9000, Facebook: 8000, Instagram: 7000 },
};

export interface SnsPost {
  id: string;
  platform: Platform;
  pillar: Pillar;
  views: number;
  er: number;
  url: string;
}

export const snsPosts: SnsPost[] = [
  { id: "p1", platform: "Instagram", pillar: "Career", views: 41200, er: 0.061, url: "#" },
  { id: "p2", platform: "Facebook", pillar: "Salary", views: 38800, er: 0.044, url: "#" },
  { id: "p3", platform: "Threads", pillar: "Tips", views: 33100, er: 0.072, url: "#" },
  { id: "p4", platform: "Facebook", pillar: "Career", views: 30400, er: 0.039, url: "#" },
  { id: "p5", platform: "Instagram", pillar: "Culture", views: 28700, er: 0.058, url: "#" },
  { id: "p6", platform: "Threads", pillar: "Salary", views: 26500, er: 0.066, url: "#" },
  { id: "p7", platform: "Instagram", pillar: "Tips", views: 24900, er: 0.053, url: "#" },
  { id: "p8", platform: "Facebook", pillar: "News", views: 21300, er: 0.028, url: "#" },
  { id: "p9", platform: "Threads", pillar: "Career", views: 19800, er: 0.069, url: "#" },
  { id: "p10", platform: "Instagram", pillar: "Salary", views: 18200, er: 0.047, url: "#" },
];

const STATS: Record<Platform, { sessions: number; er: number; followers: number }> = {
  Threads: { sessions: 4200, er: 0.038, followers: 18400 },
  Facebook: { sessions: 6100, er: 0.026, followers: 42300 },
  Instagram: { sessions: 5300, er: 0.045, followers: 31200 },
};

function trend(value: number): number[] {
  return [0.86, 0.9, 0.94, 0.97, 1].map((f) => Math.round(value * f));
}

function trendF(value: number): number[] {
  return [0.9, 0.93, 0.96, 0.98, 1].map((f) => +(value * f).toFixed(4));
}

export function snsMetrics(tab: PlatformTab): MetricSummary[] {
  const platforms: Platform[] =
    tab === "All" ? [...SNS_PLATFORMS] : [tab];

  const viewsSeries = viewsByWeek.map((w) =>
    platforms.reduce((s, p) => s + w[p], 0)
  );
  const views = viewsSeries.reduce((a, b) => a + b, 0);
  const sessions = platforms.reduce((s, p) => s + STATS[p].sessions, 0);
  const followers = platforms.reduce((s, p) => s + STATS[p].followers, 0);
  const er =
    platforms.reduce((s, p) => s + STATS[p].er, 0) / platforms.length;

  return [
    { key: "views", label: "Views", value: views, unit: "number", series: viewsSeries },
    { key: "sessions", label: "Sessions", value: sessions, unit: "number", series: trend(sessions) },
    { key: "er", label: "Avg ER", value: er, unit: "percent", series: trendF(er) },
    { key: "followers", label: "Followers", value: followers, unit: "number", series: trend(followers) },
  ];
}
