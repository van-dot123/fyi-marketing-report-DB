"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { alerts } from "@/lib/alertsData";
import { formatValue, formatPct } from "@/lib/format";

export default function AlertsPage() {
  return (
    <>
      <p className="mb-6 text-sm text-slate-500">
        {alerts.length} metric{alerts.length === 1 ? "" : "s"} changed more than
        15% week-over-week.
      </p>

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
                <span className="text-sm font-semibold text-slate-800">
                  {alert.metric}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {alert.week}
                </span>
              </div>

              <div
                className={[
                  "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold",
                  positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
                ].join(" ")}
              >
                {positive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {formatPct(alert.pct)}
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <span>{formatValue(alert.previous, alert.unit)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                <span className="font-medium text-slate-800">
                  {formatValue(alert.current, alert.unit)}
                </span>
              </div>

              <div className="mt-3 text-xs font-medium text-purple-600 opacity-0 transition-opacity group-hover:opacity-100">
                View details →
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
