"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import SpendSessionsChart from "@/components/SpendSessionsChart";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import { Ga4Day, MetaDay, SnsPostRow } from "@/lib/realData";
import {
  PLATFORM_COLORS,
  funnelWeekly,
  inRange,
  paidCreatives,
  paidMetrics,
  trafficWeekly,
} from "@/lib/aggregate";
import { Unit, formatNumber, formatPct, formatPercent, formatValue } from "@/lib/format";

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

function wowOf(series: number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  const prev = series[n - 2];
  return prev ? (series[n - 1] - prev) / prev : 0;
}

const CR_BENCHMARKS = [
  { green: 0.03, amber: 0.01 },
  { green: 0.5, amber: 0.2 },
  { green: 0.1, amber: 0.03 },
];

function crColor(index: number, cr: number): string {
  const b = CR_BENCHMARKS[index] ?? { green: 0.5, amber: 0.1 };
  if (cr >= b.green) return "bg-emerald-50 text-emerald-700";
  if (cr >= b.amber) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function WowBadge({ wow }: { wow: number }) {
  const positive = wow >= 0;
  return (
    <span className={["inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"].join(" ")}>
      {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {formatPct(wow)}
    </span>
  );
}

function StatCard({ label, value, unit, wow }: { label: string; value: number; unit: Unit; wow?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{formatValue(value, unit)}</p>
      {wow !== undefined && <div className="mt-2"><WowBadge wow={wow} /></div>}
    </div>
  );
}

function ProductMetrics({ spend, start, end }: { spend: number; start: string; end: string }) {
  const [status, setStatus] = useState<"loading" | "connecting" | "no-data" | "ready">("loading");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setStatus("connecting");
      return;
    }
    let active = true;
    setStatus("loading");
    supabase
      .from("salary_submissions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${start}T00:00:00`)
      .lte("created_at", `${end}T23:59:59`)
      .then(({ count: rows, error }) => {
        if (!active) return;
        if (error) setStatus("connecting");
        else if (!rows) {
          setCount(0);
          setStatus("no-data");
        } else {
          setCount(rows);
          setStatus("ready");
        }
      });
    return () => {
      active = false;
    };
  }, [start, end]);

  if (status === "loading") {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400 shadow-sm">Loading submissions…</div>;
  }
  if (status !== "ready") return <EmptyState variant={status} />;

  const bothPresent = spend > 0 && count > 0;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <StatCard label="Submissions" value={count} unit="number" />
      {bothPresent ? (
        <StatCard label="Cost per Submission" value={Math.round(spend / count)} unit="currency" />
      ) : (
        <EmptyState variant="no-data" message="Need both spend and submission data" />
      )}
    </div>
  );
}

function SectionHead({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-purple-600 hover:text-purple-700">
          {cta} →
        </Link>
      )}
    </div>
  );
}

export default function Overview({
  meta,
  ga4,
  sns,
  missingKey,
}: {
  meta: MetaDay[];
  ga4: Ga4Day[];
  sns: SnsPostRow[];
  missingKey: boolean;
}) {
  const { start, end } = useDateRange();
  const paidDays = inRange(meta, start, end);
  const ga4Days = inRange(ga4, start, end);
  const snsDays = inRange(sns, start, end);

  const paidCards = paidMetrics(paidDays);

  const tw = trafficWeekly(ga4Days);
  const totalSeries = tw.map((w) => w.total);
  const paidSeries = tw.map((w) => w.paid);
  const orgSeries = tw.map((w) => w.organic);
  const otherSeries = tw.map((w) => w.other);

  const fw = funnelWeekly(paidDays, ga4Days);
  const fSum = (pick: (w: (typeof fw)[number]) => number) => fw.reduce((s, w) => s + pick(w), 0);
  const spend = fSum((w) => w.spend);

  const chartData = fw.map((w) => ({ week: w.week, spend: w.spend, sessions: w.sessions }));

  const stages = [
    { label: "Impressions", value: fSum((w) => w.impressions) },
    { label: "Clicks", value: fSum((w) => w.clicks) },
    { label: "Sessions", value: fSum((w) => w.sessions) },
    { label: "Conversions", value: fSum((w) => w.conversions) },
  ];
  const funnelMax = stages[0].value || 1;

  const bestCreative = paidCreatives(paidDays)[0];
  const bestPost = [...snsDays].sort((a, b) => b.views - a.views)[0];

  return (
    <div className="space-y-8">
      {missingKey && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          GOOGLE_SHEETS_API_KEY is missing — live data may be unavailable.
        </div>
      )}

      <section>
        <SectionHead title="Paid metrics" href="/paid" cta="View details" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {paidCards.map((metric) => (
            <StatCard key={metric.key} label={metric.label} value={metric.value} unit={metric.unit} wow={wowOf(metric.series)} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Traffic metrics" href="/sns" cta="View details" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Sessions" value={sum(totalSeries)} unit="number" wow={wowOf(totalSeries)} />
          <StatCard label="Paid Sessions (meta)" value={sum(paidSeries)} unit="number" wow={wowOf(paidSeries)} />
          <StatCard label="Organic Sessions (SNS)" value={sum(orgSeries)} unit="number" wow={wowOf(orgSeries)} />
          <StatCard label="Direct & Other" value={sum(otherSeries)} unit="number" wow={wowOf(otherSeries)} />
        </div>
      </section>

      <section>
        <SectionHead title="Product metrics" href="/funnel" cta="View details" />
        <ProductMetrics spend={spend} start={start} end={end} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col">
          <SectionHead title="Spend & Sessions" href="/paid" cta="View details" />
          <SpendSessionsChart data={chartData} height={280} />
        </section>

        <section className="flex flex-col">
          <SectionHead title="Funnel snapshot" href="/funnel" cta="View full funnel" />
          <div className="flex flex-1 flex-col justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {stages.map((stage, i) => {
              const next = stages[i + 1];
              const cr = next && stage.value ? next.value / stage.value : 0;
              const width = `${((stage.value / funnelMax) * 100).toFixed(1)}%`;
              return (
                <Fragment key={stage.label}>
                  <div className="flex items-center gap-3">
                    <span className="w-[120px] shrink-0 text-sm text-slate-600">{stage.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-purple-600" style={{ width }} />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                      {formatNumber(stage.value)}
                    </span>
                  </div>
                  {next && (
                    <div className="flex justify-center py-1.5">
                      <span className={["inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", crColor(i, cr)].join(" ")}>
                        <ArrowDown className="h-3 w-3" />
                        {formatPercent(cr)}
                      </span>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>
      </div>

      <section>
        <SectionHead title="Quick glance" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Best paid creative</h3>
              <Link href="/paid" className="text-sm font-medium text-purple-600 hover:text-purple-700">View all →</Link>
            </div>
            {bestCreative ? (
              <>
                <p className="truncate font-medium text-slate-800">{bestCreative.adName}</p>
                <div className="mt-3 flex gap-8 text-sm">
                  <div>
                    <p className="text-slate-400">CPL</p>
                    <p className="font-semibold text-slate-900">{formatValue(bestCreative.cpl, "currency")}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Leads</p>
                    <p className="font-semibold text-slate-900">{formatNumber(bestCreative.leads)}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">No data in range.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Best organic post</h3>
              <Link href="/sns" className="text-sm font-medium text-purple-600 hover:text-purple-700">View all →</Link>
            </div>
            {bestPost ? (
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <p className="text-slate-400">Platform</p>
                  <span className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: PLATFORM_COLORS[bestPost.platform] }}>
                    {bestPost.platform}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400">Pillar</p>
                  <p className="font-semibold text-slate-900">{bestPost.pillar}</p>
                </div>
                <div>
                  <p className="text-slate-400">Views</p>
                  <p className="font-semibold text-slate-900">{formatNumber(bestPost.views)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No data in range.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
