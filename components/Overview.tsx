"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown } from "lucide-react";
import SpendSessionsChart from "@/components/SpendSessionsChart";
import EmptyState from "@/components/EmptyState";
import ComparisonBadge from "@/components/ComparisonBadge";
import { useDateRange } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import { Ga4Day, MetaDay, SnsPostRow } from "@/lib/realData";
import {
  PLATFORM_COLORS,
  funnelWeekly,
  inRange,
  metaTotals,
  paidCreatives,
  paidMetrics,
  trafficTotals,
  trafficWeekly,
} from "@/lib/aggregate";
import { Unit, formatNumber, formatPercent, formatPeriod, formatValue } from "@/lib/format";

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

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

function StatCard({
  label,
  value,
  unit,
  previous,
  periodLabel,
}: {
  label: string;
  value: number;
  unit: Unit;
  previous?: number | null;
  periodLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{formatValue(value, unit)}</p>
      {periodLabel !== undefined && (
        <div className="mt-2">
          <ComparisonBadge value={value} previous={previous ?? null} periodLabel={periodLabel} />
        </div>
      )}
    </div>
  );
}

interface ProductData {
  total: number;
  paid: number;
  organic: number;
  direct: number;
  jobApps: number;
}

const PAID_SOURCES = ["MT", "meta"];
const ORGANIC_SOURCES = ["facebook", "threads", "instagram", "zalo"];

function ProductMetrics({ spend, start, end }: { spend: number; start: string; end: string }) {
  const [status, setStatus] = useState<"loading" | "connecting" | "ready">("loading");
  const [data, setData] = useState<ProductData>({ total: 0, paid: 0, organic: 0, direct: 0, jobApps: 0 });

  useEffect(() => {
    if (!supabase) {
      setStatus("connecting");
      return;
    }
    let active = true;
    setStatus("loading");
    const lo = `${start}T00:00:00`;
    const hi = `${end}T23:59:59`;
    const subs = () =>
      supabase!
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lo)
        .lte("created_at", hi);

    Promise.all([
      subs(),
      subs().in("source", PAID_SOURCES),
      subs().in("source", ORGANIC_SOURCES),
      subs().eq("source", "direct"),
      supabase
        .from("job_applications")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lo)
        .lte("created_at", hi),
    ]).then((res) => {
      if (!active) return;
      if (res.some((r) => r.error)) {
        setStatus("connecting");
        return;
      }
      setData({
        total: res[0].count ?? 0,
        paid: res[1].count ?? 0,
        organic: res[2].count ?? 0,
        direct: res[3].count ?? 0,
        jobApps: res[4].count ?? 0,
      });
      setStatus("ready");
    });
    return () => {
      active = false;
    };
  }, [start, end]);

  if (status === "loading") {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400 shadow-sm">Loading submissions…</div>;
  }
  if (status === "connecting") return <EmptyState variant="connecting" />;
  if (data.total === 0) return <EmptyState variant="no-data" />;

  const breakdown = [
    { label: "Paid (MT / meta)", value: data.paid },
    { label: "Organic (SNS)", value: data.organic },
    { label: "Direct", value: data.direct },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Submissions" value={data.total} unit="number" />
        <StatCard label="Job Applications" value={data.jobApps} unit="number" />
        <StatCard
          label="Cost per Submission"
          value={spend > 0 ? Math.round(spend / data.total) : 0}
          unit="currency"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Submissions by source</h3>
        <div className="space-y-3">
          {breakdown.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm text-slate-600">{b.label}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-purple-600"
                  style={{ width: `${data.total ? ((b.value / data.total) * 100).toFixed(1) : 0}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                {formatNumber(b.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
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
  const { start, end, previousStart, previousEnd } = useDateRange();
  const paidDays = inRange(meta, start, end);
  const ga4Days = inRange(ga4, start, end);
  const snsDays = inRange(sns, start, end);

  const periodLabel = formatPeriod(previousStart, previousEnd);
  const prevPaid = inRange(meta, previousStart, previousEnd);
  const prevGa4 = inRange(ga4, previousStart, previousEnd);
  const prevPaidTotals = prevPaid.length ? metaTotals(prevPaid) : null;
  const prevTraffic = prevGa4.length ? trafficTotals(prevGa4) : null;

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
            <StatCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              previous={prevPaidTotals ? prevPaidTotals[metric.key] : null}
              periodLabel={periodLabel}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Traffic metrics" href="/sns" cta="View details" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Sessions" value={sum(totalSeries)} unit="number" previous={prevTraffic ? prevTraffic.total : null} periodLabel={periodLabel} />
          <StatCard label="Paid Sessions (meta)" value={sum(paidSeries)} unit="number" previous={prevTraffic ? prevTraffic.paid : null} periodLabel={periodLabel} />
          <StatCard label="Organic Sessions (SNS)" value={sum(orgSeries)} unit="number" previous={prevTraffic ? prevTraffic.organic : null} periodLabel={periodLabel} />
          <StatCard label="Direct & Other" value={sum(otherSeries)} unit="number" previous={prevTraffic ? prevTraffic.other : null} periodLabel={periodLabel} />
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
