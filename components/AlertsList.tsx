"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Unit, formatPct, formatValue } from "@/lib/format";

export interface Alert {
  source: string;
  metric: string;
  weekRange: string;
  weekNum: number;
  current: number;
  previous: number;
  pct: number;
  unit: Unit;
  href: string;
}

const SOURCE_BADGE: Record<string, string> = {
  "Paid Channel": "bg-purple-50 text-purple-700",
  "Organic SNS": "bg-pink-50 text-pink-700",
  Overview: "bg-blue-50 text-blue-700",
};

const PAGE_SIZE = 10;

export default function AlertsList({ alerts }: { alerts: Alert[] }) {
  const [showAll, setShowAll] = useState(false);

  if (alerts.length === 0) {
    return <p className="text-sm text-slate-400">No significant week-over-week movements.</p>;
  }

  const visible = showAll ? alerts : alerts.slice(0, PAGE_SIZE);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((alert, i) => {
          const positive = alert.pct >= 0;
          return (
            <Link
              key={`${alert.source}-${alert.metric}-${alert.weekRange}-${i}`}
              href={alert.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-purple-300"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={["shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", SOURCE_BADGE[alert.source] ?? "bg-slate-100 text-slate-600"].join(" ")}>
                    {alert.source}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-800">{alert.metric}</span>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">{alert.weekRange}</span>
              </div>
              <div className={["mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold", positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"].join(" ")}>
                {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatPct(alert.pct * 100)}
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

      {alerts.length > PAGE_SIZE && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-5 text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          {showAll ? "Show less" : `See all (${alerts.length})`}
        </button>
      )}
    </>
  );
}
