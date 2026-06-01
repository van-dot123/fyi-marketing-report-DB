import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPct } from "@/lib/format";

export default function ComparisonBadge({
  value,
  previous,
  periodLabel,
}: {
  value: number;
  previous: number | null;
  periodLabel: string;
}) {
  if (previous === null || previous === 0) {
    return (
      <p className="text-xs text-slate-400">vs prior period: N/A</p>
    );
  }

  const pct = (value - previous) / previous;
  const positive = pct >= 0;

  return (
    <div className="space-y-0.5">
      <span
        className={[
          "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
          positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
        ].join(" ")}
      >
        {positive ? (
          <ArrowUpRight className="h-3.5 w-3.5" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5" />
        )}
        {formatPct(pct)}
      </span>
      <p className="text-[11px] text-slate-400">vs {periodLabel}</p>
    </div>
  );
}
