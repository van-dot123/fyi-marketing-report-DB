"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { annotations, weekly } from "@/lib/mockData";

export default function SpendSessionsChart() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Ad Spend &amp; Sessions
          </h2>
          <p className="text-sm text-slate-500">
            Weekly spend vs. site sessions
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={weekly}
            margin={{ top: 20, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              label={{
                value: "Spend (₫)",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

            {annotations.map((a) => (
              <ReferenceLine
                key={a.week}
                yAxisId="left"
                x={a.week}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: a.label,
                  position: "top",
                  fill: "#b45309",
                  fontSize: 10,
                }}
              />
            ))}

            <Bar
              yAxisId="left"
              dataKey="spend"
              name="Spend"
              fill="#7c3aed"
              radius={[4, 4, 0, 0]}
              barSize={36}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sessions"
              name="Sessions"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              isAnimationActive
              animationDuration={900}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
