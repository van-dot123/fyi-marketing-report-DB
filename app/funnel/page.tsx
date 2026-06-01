"use client";

import {
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useDateRange } from "@/components/DateRangePicker";
import { filterByRange } from "@/lib/mockData";
import { funnelStages, funnelWeekly } from "@/lib/funnelData";
import { formatCurrency, formatNumber, formatPercent, formatPct } from "@/lib/format";

export default function FunnelPage() {
  const { start, end } = useDateRange();
  const weeks = filterByRange(funnelWeekly, start, end);
  const stages = funnelStages(weeks);

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">
          Conversion Funnel
        </h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip
                formatter={(v: number) => formatNumber(v)}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Funnel dataKey="value" data={stages} isAnimationActive>
                <LabelList position="right" fill="#334155" stroke="none" dataKey="name" className="text-sm" />
                <LabelList position="left" fill="#94a3b8" stroke="none" dataKey="value" formatter={(v: number) => formatNumber(v)} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">
          Weekly Funnel Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-medium">Week</th>
                <th className="pb-3 text-right font-medium">Spend</th>
                <th className="pb-3 text-right font-medium">Sessions</th>
                <th className="pb-3 text-right font-medium">Conv Rate</th>
                <th className="pb-3 text-right font-medium">Submissions</th>
                <th className="pb-3 text-right font-medium">Cost / Sub</th>
                <th className="pb-3 text-right font-medium">WoW</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const convRate = w.sessions ? w.conversions / w.sessions : 0;
                const costPerSub = w.submissions ? w.spend / w.submissions : 0;
                const prev = weeks[i - 1];
                const wow =
                  prev && prev.submissions
                    ? (w.submissions - prev.submissions) / prev.submissions
                    : null;
                const flagged = wow !== null && Math.abs(wow) > 0.15;
                const positive = (wow ?? 0) >= 0;

                return (
                  <tr key={w.week} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{w.week}</td>
                    <td className="py-3 text-right text-slate-600">{formatCurrency(w.spend)}</td>
                    <td className="py-3 text-right text-slate-600">{formatNumber(w.sessions)}</td>
                    <td className="py-3 text-right text-slate-600">{formatPercent(convRate)}</td>
                    <td className="py-3 text-right text-slate-600">{formatNumber(w.submissions)}</td>
                    <td className="py-3 text-right font-medium text-slate-800">{formatCurrency(costPerSub)}</td>
                    <td className="py-3 text-right">
                      {wow === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                            positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
                            flagged ? "ring-1 ring-amber-300" : "",
                          ].join(" ")}
                        >
                          {formatPct(wow)}
                          {flagged ? " ⚠" : ""}
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
