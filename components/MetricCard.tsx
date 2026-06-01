"use client";

import { Line, LineChart } from "recharts";
import {
  LucideIcon,
  Wallet,
  Users,
  Target,
  MousePointerClick,
  Percent,
  Eye,
  Heart,
  UserPlus,
  FileText,
  Activity,
} from "lucide-react";
import { MetricSummary } from "@/lib/mockData";
import ComparisonBadge from "@/components/ComparisonBadge";
import { formatValue } from "@/lib/format";

const icons: Record<string, LucideIcon> = {
  spend: Wallet,
  leads: Users,
  cpl: Target,
  sessions: MousePointerClick,
  ctr: Percent,
  views: Eye,
  er: Heart,
  followers: UserPlus,
  conversions: Target,
  submissions: FileText,
};

export default function MetricCard({
  metric,
  previous,
  periodLabel,
}: {
  metric: MetricSummary;
  previous: number | null;
  periodLabel: string;
}) {
  const { key, label, value, unit, series } = metric;
  const Icon = icons[key] ?? Activity;
  const display = formatValue(value, unit);
  const up = previous !== null && previous !== 0 ? value >= previous : true;
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
        <ComparisonBadge value={value} previous={previous} periodLabel={periodLabel} />

        <LineChart width={60} height={30} data={sparkData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={up ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </div>
    </div>
  );
}
