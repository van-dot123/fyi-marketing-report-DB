export interface MetricSummary {
  key: string;
  label: string;
  value: number;
  unit: "currency" | "number";
  wow: number;
  spark: number[];
}

export interface WeeklySpend {
  week: string;
  April: number;
  "K-Tuvi": number;
  "Job-page": number;
  sessions: number;
}

export interface PolicyAnnotation {
  week: string;
  label: string;
}

export interface TopAd {
  rank: number;
  name: string;
  leads: number;
  cpl: number;
}

export interface AnalysisNote {
  id: string;
  author: string;
  text: string;
  date: string;
}

export const metricSummaries: MetricSummary[] = [
  {
    key: "spend",
    label: "Total Spend",
    value: 184_320_000,
    unit: "currency",
    wow: 0.12,
    spark: [28, 31, 30, 35, 38, 41, 46],
  },
  {
    key: "leads",
    label: "Leads",
    value: 1_284,
    unit: "number",
    wow: 0.08,
    spark: [160, 172, 168, 190, 205, 198, 221],
  },
  {
    key: "cpl",
    label: "CPL",
    value: 143_500,
    unit: "currency",
    wow: -0.03,
    spark: [152, 149, 151, 147, 145, 146, 143],
  },
  {
    key: "sessions",
    label: "Sessions",
    value: 42_910,
    unit: "number",
    wow: 0.21,
    spark: [5200, 5600, 5400, 6100, 6800, 7200, 8600],
  },
];

export const weeklySpend: WeeklySpend[] = [
  { week: "W18", April: 18, "K-Tuvi": 12, "Job-page": 8, sessions: 6200 },
  { week: "W19", April: 21, "K-Tuvi": 14, "Job-page": 9, sessions: 6900 },
  { week: "W20", April: 24, "K-Tuvi": 11, "Job-page": 13, sessions: 8100 },
  { week: "W21", April: 22, "K-Tuvi": 16, "Job-page": 12, sessions: 8800 },
  { week: "W22", April: 27, "K-Tuvi": 18, "Job-page": 15, sessions: 9600 },
];

export const policyAnnotations: PolicyAnnotation[] = [
  { week: "W20", label: "Meta policy update" },
  { week: "W22", label: "New creative batch" },
];

export const topAds: TopAd[] = [
  { rank: 1, name: "April — Lunar Reading Carousel", leads: 312, cpl: 118_000 },
  { rank: 2, name: "K-Tuvi — Daily Horoscope Reel", leads: 274, cpl: 131_500 },
  { rank: 3, name: "Job-page — Hiring Now Story", leads: 198, cpl: 152_000 },
];

export const analysisNotes: AnalysisNote[] = [
  {
    id: "n1",
    author: "Marketing",
    text: "Sessions spike in W22 correlates with the new creative batch launch.",
    date: "2026-05-28",
  },
  {
    id: "n2",
    author: "Performance",
    text: "CPL trending down across all products — keep scaling April budget.",
    date: "2026-05-25",
  },
];
