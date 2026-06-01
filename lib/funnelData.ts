export interface FunnelWeek {
  week: string;
  spend: number;
  sessions: number;
  conversions: number;
  submissions: number;
}

export const funnelWeekly: FunnelWeek[] = [
  { week: "W18", spend: 120000, sessions: 1200, conversions: 96, submissions: 40 },
  { week: "W19", spend: 145000, sessions: 1650, conversions: 140, submissions: 58 },
  { week: "W20", spend: 160000, sessions: 2100, conversions: 189, submissions: 82 },
  { week: "W21", spend: 175000, sessions: 2800, conversions: 266, submissions: 120 },
  { week: "W22", spend: 155000, sessions: 2400, conversions: 216, submissions: 96 },
];

export interface FunnelStage {
  name: string;
  value: number;
  fill: string;
}

export function funnelStages(weeks: FunnelWeek[]): FunnelStage[] {
  const sum = (pick: (w: FunnelWeek) => number) =>
    weeks.reduce((s, w) => s + pick(w), 0);
  return [
    { name: "Ad Spend", value: sum((w) => w.spend), fill: "#7c3aed" },
    { name: "Sessions", value: sum((w) => w.sessions), fill: "#2563eb" },
    { name: "Conversions", value: sum((w) => w.conversions), fill: "#06b6d4" },
    { name: "Submissions", value: sum((w) => w.submissions), fill: "#10b981" },
  ];
}
