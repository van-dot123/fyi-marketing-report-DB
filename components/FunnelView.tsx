"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import { Ga4Day, MetaDay } from "@/lib/realData";
import { funnelWeekly, inRange } from "@/lib/aggregate";
import { formatKRW, formatNumber, formatPct, formatPercent } from "@/lib/format";

// Benchmark conversion rates per stage transition (green / amber thresholds):
//   Reach → Sessions, Sessions → Sign-ups, Sign-ups → Applies
const CR_BENCHMARKS = [
  { green: 0.01, amber: 0.004 },
  { green: 0.05, amber: 0.02 },
  { green: 0.3, amber: 0.1 },
];

function crColor(i: number, cr: number): string {
  const b = CR_BENCHMARKS[i] ?? { green: 0.5, amber: 0.1 };
  if (cr >= b.green) return "bg-emerald-50 text-emerald-700";
  if (cr >= b.amber) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function dayStartISO(iso: string): string {
  return new Date(`${iso}T00:00:00`).toISOString();
}

function dayEndISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

async function countInRange(table: string, lo: string, hi: string): Promise<number | null> {
  if (!supabase) return null;
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte("created_at", lo)
    .lte("created_at", hi);
  if (error) {
    console.warn(`[funnel] ${table} count error: ${error.message}`);
    return null;
  }
  return count ?? 0;
}

// Sign-ups come from auth.users via the get_signups_count() SECURITY DEFINER
// RPC (user_profiles undercounts). Boundaries match the other Supabase queries:
// full local day from 00:00:00.000 of `rangeStart` to 23:59:59.999 of `rangeEnd`.
async function fetchSignupsCount(rangeStart: string, rangeEnd: string): Promise<number | null> {
  if (!supabase) return null;
  const start = new Date(`${rangeStart}T00:00:00`);
  start.setHours(0, 0, 0, 0);
  const end = new Date(`${rangeEnd}T00:00:00`);
  end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase.rpc("get_signups_count", {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  });
  if (error) {
    console.warn(`[funnel] get_signups_count error: ${error.message}`);
    return null;
  }
  return Number(data) || 0;
}

// "2025-04-21" → "04-21"; renders a "04-21 ~ 04-27" week range.
function fmtWeekRange(startISO: string, endISO: string): string {
  const md = (iso: string) => (iso ? iso.slice(5) : "");
  return startISO && endISO ? `${md(startISO)} ~ ${md(endISO)}` : "—";
}

export default function FunnelView({ meta, ga4 }: { meta: MetaDay[]; ga4: Ga4Day[] }) {
  const { start, end } = useDateRange();

  const rangedMeta = useMemo(() => inRange(meta, start, end), [meta, start, end]);
  const rangedGa4 = useMemo(() => inRange(ga4, start, end), [ga4, start, end]);
  const weeks = useMemo(() => funnelWeekly(rangedMeta, rangedGa4), [rangedMeta, rangedGa4]);

  const [signups, setSignups] = useState<number | null>(null);
  const [applies, setApplies] = useState<number | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setDbReady(false);
      return;
    }
    let active = true;
    const lo = dayStartISO(start);
    const hi = dayEndISO(end);
    (async () => {
      const [su, ap] = await Promise.all([
        fetchSignupsCount(start, end),
        countInRange("job_applications", lo, hi),
      ]);
      if (!active) return;
      setSignups(su);
      setApplies(ap);
      setDbReady(su !== null || ap !== null);
    })();
    return () => {
      active = false;
    };
  }, [start, end]);

  if (weeks.length === 0) {
    return <EmptyState title="No funnel data in range" message="No meta or GA4 rows for the selected dates." />;
  }

  const reach = rangedMeta.reduce((s, d) => s + d.reach, 0);
  const sessions = rangedGa4.reduce((s, d) => s + d.sessions, 0);

  const stages = [
    { name: "Reach", source: "Meta Ads", value: reach, fill: "#7c3aed" },
    { name: "Sessions", source: "GA4", value: sessions, fill: "#2563eb" },
    { name: "Sign-ups", source: "auth.users (rpc)", value: signups ?? 0, fill: "#0891b2" },
    { name: "Applies", source: "job_applications", value: applies ?? 0, fill: "#06b6d4" },
  ];
  const topValue = stages[0].value || 1;

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Conversion Funnel</h2>
        <p className="mb-5 text-sm text-slate-500">Reach → Sessions → Sign-ups → Applies</p>

        <div className="space-y-2.5">
          {stages.map((s, i) => {
            const width = Math.max((s.value / topValue) * 100, 1.5);
            const fromPrev = i > 0 && stages[i - 1].value ? s.value / stages[i - 1].value : null;
            return (
              <div key={s.name} className="flex items-center gap-4">
                {/* Value column — fixed width, right-aligned, never overlaps the bar */}
                <div className="w-28 shrink-0 text-right">
                  <p className="text-base font-semibold tabular-nums text-slate-900">{formatNumber(s.value)}</p>
                  {fromPrev !== null && <p className="text-[11px] tabular-nums text-slate-400">{formatPercent(fromPrev)}</p>}
                </div>
                {/* Centered proportional bar */}
                <div className="flex-1">
                  <div className="mx-auto rounded-md transition-all" style={{ width: `${width}%`, height: 34, backgroundColor: s.fill }} />
                </div>
                {/* Label column — fixed width on the right */}
                <div className="w-36 shrink-0">
                  <p className="text-sm font-medium text-slate-700">{s.name}</p>
                  <p className="text-[11px] text-slate-400">{s.source}</p>
                </div>
              </div>
            );
          })}
        </div>

        {!dbReady && (
          <p className="mt-4 text-[11px] text-slate-400">Supabase not connected — Sign-ups and Applies show 0.</p>
        )}
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
                <th className="pb-3 text-right font-medium">Reach</th>
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
                    <td className="py-3 font-medium tabular-nums text-slate-800">{fmtWeekRange(w.weekStart, w.weekEnd)}</td>
                    <td className="py-3 text-right text-slate-600">{formatKRW(w.spend)}</td>
                    <td className="py-3 text-right text-slate-600">{formatNumber(w.reach)}</td>
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
