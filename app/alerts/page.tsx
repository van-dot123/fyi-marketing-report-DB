import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { getGa4Days, getMetaDays, getSnsPosts } from "@/lib/realData";
import { funnelWeekly, metaWeekly, snsWeekly } from "@/lib/aggregate";
import { Unit, formatPct, formatValue } from "@/lib/format";

interface Alert {
  metric: string;
  week: string;
  current: number;
  previous: number;
  pct: number;
  unit: Unit;
  href: string;
}

interface SeriesDef {
  metric: string;
  unit: Unit;
  href: string;
  points: { week: string; value: number }[];
}

function buildAlerts(series: SeriesDef[]): Alert[] {
  const out: Alert[] = [];
  for (const s of series) {
    for (let i = 1; i < s.points.length; i++) {
      const previous = s.points[i - 1].value;
      const current = s.points[i].value;
      const pct = previous ? (current - previous) / previous : 0;
      if (Math.abs(pct) > 0.15) {
        out.push({ metric: s.metric, week: s.points[i].week, current, previous, pct, unit: s.unit, href: s.href });
      }
    }
  }
  return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
}

export default async function AlertsPage() {
  const [meta, ga4, posts] = await Promise.all([getMetaDays(), getGa4Days(), getSnsPosts()]);
  const mw = metaWeekly(meta);
  const fw = funnelWeekly(meta, ga4);
  const sw = snsWeekly(posts, "All");

  const alerts = buildAlerts([
    { metric: "Spend", unit: "currency", href: "/paid", points: mw.map((w) => ({ week: w.week, value: w.spend })) },
    { metric: "Leads", unit: "number", href: "/paid", points: mw.map((w) => ({ week: w.week, value: w.leads })) },
    { metric: "CPL", unit: "currency", href: "/paid", points: mw.map((w) => ({ week: w.week, value: w.cpl })) },
    { metric: "Sessions", unit: "number", href: "/", points: fw.map((w) => ({ week: w.week, value: w.sessions })) },
    { metric: "Conversions", unit: "number", href: "/funnel", points: fw.map((w) => ({ week: w.week, value: w.conversions })) },
    { metric: "Views", unit: "number", href: "/sns", points: sw.map((w) => ({ week: w.week, value: w.views })) },
  ]);

  return (
    <>
      <p className="mb-6 text-sm text-slate-500">
        {alerts.length} metric{alerts.length === 1 ? "" : "s"} changed more than 15% week-over-week.
      </p>

      {alerts.length === 0 ? (
        <p className="text-sm text-slate-400">No significant week-over-week movements.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert, i) => {
            const positive = alert.pct >= 0;
            return (
              <Link
                key={`${alert.metric}-${alert.week}-${i}`}
                href={alert.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-purple-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{alert.metric}</span>
                  <span className="text-xs font-medium text-slate-400">{alert.week}</span>
                </div>
                <div className={["mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold", positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"].join(" ")}>
                  {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {formatPct(alert.pct)}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <span>{formatValue(alert.previous, alert.unit)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                  <span className="font-medium text-slate-800">{formatValue(alert.current, alert.unit)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
