interface MetricCardProps {
  label: string;
  value: string;
  /** Week-over-week percentage change as a fraction (e.g. 0.12 = +12%). */
  wowChange?: number;
}

/**
 * Summary metric tile. Flags significant week-over-week swings
 * (|change| > 0.15) per the dashboard data rules.
 */
export default function MetricCard({ label, value, wowChange }: MetricCardProps) {
  const isSignificant = wowChange !== undefined && Math.abs(wowChange) > 0.15;
  const isPositive = (wowChange ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {wowChange !== undefined && (
        <p
          className={[
            "mt-1 text-sm font-medium",
            isPositive ? "text-emerald-600" : "text-red-600",
            isSignificant ? "font-bold" : "",
          ].join(" ")}
        >
          {isPositive ? "▲" : "▼"} {(Math.abs(wowChange) * 100).toFixed(1)}% WoW
          {isSignificant ? " ⚠" : ""}
        </p>
      )}
    </div>
  );
}
