"use client";

import {
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
import { Ga4Day, MetaDay } from "@/lib/realData";
import { funnelWeekly, inRange } from "@/lib/aggregate";
import { formatKRW, formatNumber, formatPct, formatPercent } from "@/lib/format";

const CR_BENCHMARKS = [
  { green: 0.03, amber: 0.01 },
  { green: 0.5, amber: 0.2 },
  { green: 0.1, amber: 0.03 },
];

function crColor(i: number, cr: number): string {
  const b = CR_BENCHMARKS[i] ?? { green: 0.5, amber: 0.1 };
  if (cr >= b.green) return "bg-emerald-50 text-emerald-700";
  if (cr >= b.amber) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default function FunnelView({ meta, ga4 }: { meta: MetaDay[]; ga4: Ga4Day[] }) {
  const { start, end } = useDateRange();
  const weeks = funnelWeekly(inRange(meta, start, end), inRange(ga4, start, end));

  if (weeks.length === 0) {
    return <EmptyState title="No funnel data in range" message="No meta or GA4 rows for the selected dates." />;
  }

  const sum = (pick: (w: (typeof weeks)[number]) => number) => weeks.reduce((s, w) => s + pick(w), 0);
  const stages = [
    { name: "Impressions", value: sum((w) => w.impressions), fill: "#7c3aed" },
    { name: "Clicks", value: sum((w) => w.clicks), fill: "#6366f1" },
    { name: "Sessions", value: sum((w) => w.sessions), fill: "#2563eb" },
    { name: "Conversions", value: sum((w) => w.conversions), fill: "#06b6d4" },
  ];

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Conversion Funnel</h2>
        <p className="mb-4 text-sm text-slate-500">Impressions → Clicks → Sessions → Conversions</p>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip formatter={(v: number) => formatNumber(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Funnel dataKey="value" data={stages} isAnimationActive>
                <LabelList position="right" fill="#334155" stroke="none" dataKey="name" className="text-sm" />
                <LabelList position="left" fill="#94a3b8" stroke="none" dataKey="value" formatter={(v: number) => formatNumber(v)} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Stage conversion rates</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {stages.slice(0, -1).map((stage, i) => {
            const next = stages[i + 1];
            const cr = stage.value ? next.value / stage.value : 0;
            return (
              <div key={stage.name} className="rounded-lg border border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">{stage.name} → {next.name}</p>
                <span className={["mt-1 inline-block rounded-full px-2 py-0.5 text-sm font-semibold", crColor(i, cr)].join(" ")}>
                  {formatPercent(cr)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Weekly Funnel Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-medium">Week</th>
                <th className="pb-3 text-right font-medium">Spend</th>
                <th className="pb-3 text-right font-medium">Sessions</th>
                <th className="pb-3 text-right font-medium">Conv Rate</th>
                <th className="pb-3 text-right font-medium">Conversions</th>
                <th className="pb-3 text-right font-medium">Cost / Conv</th>
                <th className="pb-3 text-right font-medium">WoW</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const convRate = w.sessions ? w.conversions / w.sessions : 0;
                const costPerConv = w.conversions ? w.spend / w.conversions : 0;
                const prev = weeks[i - 1];
                const wow = prev && prev.conversions ? (w.conversions - prev.conversions) / prev.conversions : null;
                const flagged = wow !== null && Math.abs(wow) > 0.15;
                const positive = (wow ?? 0) >= 0;
                return (
                  <tr key={w.week} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{w.week}</td>
                    <td className="py-3 text-right text-slate-600">{formatKRW(w.spend)}</td>
                    <td className="py-3 text-right text-slate-600">{formatNumber(w.sessions)}</td>
                    <td className="py-3 text-right text-slate-600">{formatPercent(convRate)}</td>
                    <td className="py-3 text-right text-slate-600">{formatNumber(w.conversions)}</td>
                    <td className="py-3 text-right font-medium text-slate-800">{formatKRW(costPerConv)}</td>
                    <td className="py-3 text-right">
                      {wow === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600", flagged ? "ring-1 ring-amber-300" : ""].join(" ")}>
                          {formatPct(wow * 100)}{flagged ? " ⚠" : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
