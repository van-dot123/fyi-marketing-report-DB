"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MetricCard from "@/components/MetricCard";
import { useDateRange } from "@/components/DateRangePicker";
import { filterByRange } from "@/lib/mockData";
import {
  cplByWeek,
  PRODUCTS,
  PRODUCT_COLORS,
  paidCreatives,
  paidMetrics,
  paidRows,
  spendByWeek,
} from "@/lib/paidData";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export default function PaidPage() {
  const { start, end } = useDateRange();
  const rows = filterByRange(paidRows, start, end);
  const metrics = paidMetrics(rows);
  const spend = spendByWeek(rows);
  const cpl = cplByWeek(rows);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            CPL Trend by Product
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpl} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {PRODUCTS.map((p) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={p}
                    stroke={PRODUCT_COLORS[p]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Spend by Product
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spend} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {PRODUCTS.map((p, i) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    stackId="spend"
                    fill={PRODUCT_COLORS[p]}
                    radius={i === PRODUCTS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    barSize={36}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">
          Creative Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Ad Name</th>
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Audience</th>
                <th className="pb-3 text-right font-medium">Spend</th>
                <th className="pb-3 text-right font-medium">Leads</th>
                <th className="pb-3 text-right font-medium">CPL</th>
                <th className="pb-3 text-right font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {paidCreatives.map((c) => (
                <tr key={c.rank} className="border-b border-slate-50 last:border-0">
                  <td className="py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                      {c.rank}
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-medium text-slate-800">{c.adName}</td>
                  <td className="py-3 pr-3">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: PRODUCT_COLORS[c.product] }}
                    >
                      {c.product}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-500">{c.audience}</td>
                  <td className="py-3 text-right text-slate-600">{formatCurrency(c.spend)}</td>
                  <td className="py-3 text-right text-slate-600">{formatNumber(c.leads)}</td>
                  <td className="py-3 text-right font-medium text-slate-800">{formatCurrency(c.cpl)}</td>
                  <td className="py-3 text-right text-slate-600">{formatPercent(c.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
