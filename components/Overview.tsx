"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SpendSessionsChart from "@/components/SpendSessionsChart";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
import { filterByRange, filterWeeks } from "@/lib/mockData";
import { paidCreatives, paidMetrics, paidRows } from "@/lib/paidData";
import { funnelWeekly } from "@/lib/funnelData";
import { PLATFORM_COLORS, contentCards } from "@/lib/snsContent";
import { Unit, formatNumber, formatPct, formatPercent, formatValue } from "@/lib/format";

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

function wowOf(series: number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  const prev = series[n - 2];
  return prev ? (series[n - 1] - prev) / prev : 0;
}

function crColor(cr: number): string {
  if (cr >= 0.5) return "bg-emerald-50 text-emerald-700";
  if (cr >= 0.1) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function WowBadge({ wow }: { wow: number }) {
  const positive = wow >= 0;
  return (
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
      {formatPct(wow)}
    </span>
  );
}

function StatCard({
  label,
  value,
  unit,
  wow,
}: {
  label: string;
  value: number;
  unit: Unit;
  wow: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {formatValue(value, unit)}
      </p>
      <div className="mt-2">
        <WowBadge wow={wow} />
      </div>
    </div>
  );
}

function SectionHead({
  title,
  href,
  cta,
}: {
  title: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          {cta} →
        </Link>
      )}
    </div>
  );
}

export default function Overview({ missingKey }: { missingKey: boolean }) {
  const { start, end } = useDateRange();
  const weeks = filterWeeks(start, end);
  const paid = filterByRange(paidRows, start, end);
  const funnelWeeks = filterByRange(funnelWeekly, start, end);

  const paidCards = paidMetrics(paid);

  const sessionsSeries = weeks.map((w) => w.sessions);
  const paidSessSeries = weeks.map((w) => Math.round(w.sessions * 0.5));
  const orgSessSeries = weeks.map((w) => Math.round(w.sessions * 0.32));

  const submissionsSeries = funnelWeeks.map((w) => w.submissions);
  const costPerSubSeries = funnelWeeks.map((w) =>
    w.submissions ? Math.round(w.spend / w.submissions) : 0
  );
  const submissions = sum(submissionsSeries);
  const spend = sum(funnelWeeks.map((w) => w.spend));
  const costPerSub = submissions ? Math.round(spend / submissions) : 0;
  const hasProductData = funnelWeeks.length > 0 && submissions > 0;

  const stages = [
    { label: "Impressions", value: sum(paid.map((r) => r.impressions)) },
    { label: "Clicks", value: sum(paid.map((r) => r.clicks)) },
    { label: "Sessions", value: sum(sessionsSeries) },
    { label: "Submissions", value: submissions },
    { label: "Job Apps", value: Math.round(submissions * 0.65) },
  ];

  const bestCreative = [...paidCreatives].sort((a, b) => b.leads - a.leads)[0];
  const bestPost = [...contentCards].sort((a, b) => b.views - a.views)[0];

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
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Traffic metrics" href="/sns" cta="View details" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard label="Total Sessions" value={sum(sessionsSeries)} unit="number" wow={wowOf(sessionsSeries)} />
          <StatCard label="Paid Sessions (meta)" value={sum(paidSessSeries)} unit="number" wow={wowOf(paidSessSeries)} />
          <StatCard label="Organic Sessions (SNS)" value={sum(orgSessSeries)} unit="number" wow={wowOf(orgSessSeries)} />
        </div>
      </section>

      <section>
        <SectionHead title="Product metrics" href="/funnel" cta="View details" />
        {hasProductData ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <StatCard label="Submissions" value={submissions} unit="number" wow={wowOf(submissionsSeries)} />
            <StatCard label="Cost per Submission" value={costPerSub} unit="currency" wow={wowOf(costPerSubSeries)} />
          </div>
        ) : (
          <EmptyState
            title="No submission data"
            message="Connect Supabase salary_submissions or widen the date range."
          />
        )}
      </section>

      <section>
        <SectionHead title="Spend & Sessions" href="/paid" cta="View details" />
        <SpendSessionsChart data={weeks} height={280} />
      </section>

      <section>
        <SectionHead title="Funnel snapshot" href="/funnel" cta="View full funnel" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {stages.map((stage, i) => {
              const next = stages[i + 1];
              const cr = next && stage.value ? next.value / stage.value : 0;
              return (
                <Fragment key={stage.label}>
                  <div className="min-w-[110px] shrink-0 rounded-lg bg-slate-50 px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">{stage.label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatNumber(stage.value)}
                    </p>
                  </div>
                  {next && (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          crColor(cr),
                        ].join(" ")}
                      >
                        {formatPercent(cr)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <SectionHead title="Quick glance" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Best paid creative
              </h3>
              <Link href="/paid" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                View all →
              </Link>
            </div>
            <p className="font-medium text-slate-800">{bestCreative.adName}</p>
            <div className="mt-3 flex gap-8 text-sm">
              <div>
                <p className="text-slate-400">CPL</p>
                <p className="font-semibold text-slate-900">
                  {formatValue(bestCreative.cpl, "currency")}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Leads</p>
                <p className="font-semibold text-slate-900">
                  {formatNumber(bestCreative.leads)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Best organic post
              </h3>
              <Link href="/sns" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                View all →
              </Link>
            </div>
            <p className="line-clamp-1 font-medium text-slate-800">
              {bestPost.caption}
            </p>
            <div className="mt-3 flex items-center gap-8 text-sm">
              <div>
                <p className="text-slate-400">Platform</p>
                <span
                  className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: PLATFORM_COLORS[bestPost.platform] }}
                >
                  {bestPost.platform}
                </span>
              </div>
              <div>
                <p className="text-slate-400">Pillar</p>
                <p className="font-semibold text-slate-900">{bestPost.pillar}</p>
              </div>
              <div>
                <p className="text-slate-400">Views</p>
                <p className="font-semibold text-slate-900">
                  {formatNumber(bestPost.views)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
