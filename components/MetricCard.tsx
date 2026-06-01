"use client";

import { Line, LineChart } from "recharts";
import {
  LucideIcon,
  Wallet,
  Users,
  Target,
  MousePointerClick,
  Activity,
} from "lucide-react";
import { MetricSummary } from "@/lib/mockData";
import { formatCurrency, formatNumber, formatPct } from "@/lib/format";

const icons: Record<string, LucideIcon> = {
  spend: Wallet,
  leads: Users,
  cpl: Target,
  sessions: MousePointerClick,
};

export default function MetricCard({ metric }: { metric: MetricSummary }) {
  const { key, label, value, unit, series } = metric;
  const Icon = icons[key] ?? Activity;
  const display = unit === "currency" ? formatCurrency(value) : formatNumber(value);

  const prev = series[series.length - 2] ?? 0;
  const last = series[series.length - 1] ?? 0;
  const wow = prev ? (last - prev) / prev : 0;
  const positive = wow >= 0;

  const sparkData = series.map((v, i) => ({ i, v }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">{display}</p>

      <div className="mt-3 flex items-end justify-between">
        <span
          className={[
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600",
          ].join(" ")}
        >
          {formatPct(wow)} WoW
        </span>

        <LineChart width={60} height={30} data={sparkData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={positive ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </div>
    </div>
  );
}
