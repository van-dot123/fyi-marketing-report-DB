export interface WeeklyPoint {
  week: string;
  start: string;
  end: string;
  spend: number;
  sessions: number;
  leads: number;
  cpl: number;
}

export const weekly: WeeklyPoint[] = [
  { week: "W18", start: "2026-05-01", end: "2026-05-05", spend: 120000, sessions: 1200, leads: 280, cpl: 428 },
  { week: "W19", start: "2026-05-06", end: "2026-05-10", spend: 145000, sessions: 1650, leads: 320, cpl: 453 },
  { week: "W20", start: "2026-05-11", end: "2026-05-17", spend: 160000, sessions: 2100, leads: 410, cpl: 390 },
  { week: "W21", start: "2026-05-18", end: "2026-05-24", spend: 175000, sessions: 2800, leads: 520, cpl: 336 },
  { week: "W22", start: "2026-05-25", end: "2026-05-31", spend: 155000, sessions: 2400, leads: 480, cpl: 323 },
];

export function filterWeeks(start: string, end: string): WeeklyPoint[] {
  return weekly.filter((w) => w.start <= end && w.end >= start);
}

export interface MetricSummary {
  key: "spend" | "leads" | "cpl" | "sessions";
  label: string;
  value: number;
  unit: "currency" | "number";
  series: number[];
}

const sum = (nums: number[]) => nums.reduce((acc, n) => acc + n, 0);

export function metricsFor(weeks: WeeklyPoint[]): MetricSummary[] {
  const spend = sum(weeks.map((w) => w.spend));
  const leads = sum(weeks.map((w) => w.leads));
  const sessions = sum(weeks.map((w) => w.sessions));
  const cpl = leads ? Math.round(spend / leads) : 0;

  return [
    { key: "spend", label: "Total Spend", value: spend, unit: "currency", series: weeks.map((w) => w.spend) },
    { key: "leads", label: "Leads", value: leads, unit: "number", series: weeks.map((w) => w.leads) },
    { key: "cpl", label: "CPL", value: cpl, unit: "currency", series: weeks.map((w) => w.cpl) },
    { key: "sessions", label: "Sessions", value: sessions, unit: "number", series: weeks.map((w) => w.sessions) },
  ];
}

export interface PolicyAnnotation {
  week: string;
  label: string;
}

export const annotations: PolicyAnnotation[] = [
  { week: "W20", label: "salary→jobs" },
  { week: "W22", label: "+rtg:eng" },
];

export interface TopAd {
  rank: number;
  name: string;
  leads: number;
  cpl: number;
}

export const topAds: TopAd[] = [
  { rank: 1, name: "underpaid", leads: 624, cpl: 298 },
  { rank: 2, name: "static-insight", leads: 511, cpl: 341 },
  { rank: 3, name: "high-salary", leads: 432, cpl: 405 },
];

export interface AnalysisNote {
  id: string;
  author: string;
  text: string;
  date: string;
}

export const analysisNotes: AnalysisNote[] = [
  {
    id: "n1",
    author: "Performance",
    text: "W22 dip across spend & sessions after the +rtg:eng retargeting shift.",
    date: "2026-05-28",
  },
  {
    id: "n2",
    author: "Marketing",
    text: "CPL trending down since W19 — salary→jobs pivot in W20 improved efficiency.",
    date: "2026-05-25",
  },
];
