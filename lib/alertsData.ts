import { Unit, weekly } from "@/lib/mockData";
import { funnelWeekly } from "@/lib/funnelData";
import { viewsByWeek } from "@/lib/snsData";

export interface Alert {
  metric: string;
  week: string;
  current: number;
  previous: number;
  pct: number;
  unit: Unit;
  href: string;
}

interface AlertSeries {
  metric: string;
  unit: Unit;
  href: string;
  points: { week: string; value: number }[];
}

function buildAlerts(): Alert[] {
  const series: AlertSeries[] = [
    { metric: "Spend", unit: "currency", href: "/paid", points: weekly.map((w) => ({ week: w.week, value: w.spend })) },
    { metric: "Sessions", unit: "number", href: "/", points: weekly.map((w) => ({ week: w.week, value: w.sessions })) },
    { metric: "Leads", unit: "number", href: "/paid", points: weekly.map((w) => ({ week: w.week, value: w.leads })) },
    { metric: "CPL", unit: "currency", href: "/paid", points: weekly.map((w) => ({ week: w.week, value: w.cpl })) },
    { metric: "Submissions", unit: "number", href: "/funnel", points: funnelWeekly.map((w) => ({ week: w.week, value: w.submissions })) },
    { metric: "Total Views", unit: "number", href: "/sns", points: viewsByWeek.map((w) => ({ week: w.week, value: w.Threads + w.Facebook + w.Instagram })) },
  ];

  const alerts: Alert[] = [];
  for (const s of series) {
    for (let i = 1; i < s.points.length; i++) {
      const previous = s.points[i - 1].value;
      const current = s.points[i].value;
      const pct = previous ? (current - previous) / previous : 0;
      if (Math.abs(pct) > 0.15) {
        alerts.push({
          metric: s.metric,
          week: s.points[i].week,
          current,
          previous,
          pct,
          unit: s.unit,
          href: s.href,
        });
      }
    }
  }

  return alerts.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
}

export const alerts = buildAlerts();
