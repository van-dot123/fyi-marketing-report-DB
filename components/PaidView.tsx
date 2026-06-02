"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import { Ga4Day, MetaDay } from "@/lib/realData";
import {
  Campaign,
  campaignProducts,
  creativesWithSessions,
  filterByCampaign,
  inRange,
  metaTotals,
} from "@/lib/aggregate";
import {
  Unit,
  formatCurrency,
  formatDateShort,
  formatNumber,
  formatPercent,
  formatValue,
} from "@/lib/format";

const PAID_SOURCES = ["MT", "meta"];
const TABS: Campaign[] = ["All", "Salary Page", "Job Page"];
const TARGETS_KEY = "fyi-paid-targets";
const ANNOTATIONS_KEY = "fyi-policy-annotations";

interface Targets {
  submissions: number;
  jobApplications: number;
  costPerSub: number;
  budget: number;
}

interface Annotation {
  date: string;
  label: string;
}

const DEFAULT_TARGETS: Targets = {
  submissions: 500,
  jobApplications: 200,
  costPerSub: 50000,
  budget: 30000000,
};

type SortKey = "adName" | "audience" | "spend" | "sessions" | "leads" | "cpl" | "ctr";

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
  }, [key]);
  const update = (v: T) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };
  return [value, update];
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${dd}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function countByDay(dates: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of dates) m.set(d, (m.get(d) ?? 0) + 1);
  return m;
}

function spendByDay(days: MetaDay[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of days) m.set(d.date, (m.get(d.date) ?? 0) + d.spend);
  return m;
}

function achievement(actual: number, target: number, lowerBetter: boolean): number {
  if (lowerBetter) return actual > 0 ? (target / actual) * 100 : 100;
  return target > 0 ? (actual / target) * 100 : 0;
}

function achColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-50 text-emerald-700";
  if (pct >= 70) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function Card({ label, value, unit }: { label: string; value: number; unit: Unit }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{formatValue(value, unit)}</p>
    </div>
  );
}

export default function PaidView({ meta, ga4 }: { meta: MetaDay[]; ga4: Ga4Day[] }) {
  const { start, end } = useDateRange();
  const days = useMemo(() => inRange(meta, start, end), [meta, start, end]);
  const ga4Days = useMemo(() => inRange(ga4, start, end), [ga4, start, end]);

  const [campaign, setCampaign] = useState<Campaign>("All");
  const [targets, setTargets] = useLocalStorage<Targets>(TARGETS_KEY, DEFAULT_TARGETS);
  const [annotations, setAnnotations] = useLocalStorage<Annotation[]>(ANNOTATIONS_KEY, []);
  const [annDate, setAnnDate] = useState(start);
  const [annLabel, setAnnLabel] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [subs, setSubs] = useState<{ date: string; source: string }[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<"loading" | "connecting" | "ready">("loading");

  useEffect(() => {
    if (!supabase) {
      setDbStatus("connecting");
      return;
    }
    let active = true;
    setDbStatus("loading");
    const lo = `${start}T00:00:00`;
    const hi = `${end}T23:59:59`;
    Promise.all([
      supabase.from("submissions").select("created_at, source").gte("created_at", lo).lte("created_at", hi),
      supabase.from("job_applications").select("created_at").gte("created_at", lo).lte("created_at", hi),
    ]).then(([s, j]) => {
      if (!active) return;
      if (s.error || j.error) {
        setDbStatus("connecting");
        return;
      }
      const subRows = (s.data ?? []).map((r: any) => ({ date: String(r.created_at).slice(0, 10), source: String(r.source ?? "") }));
      const jobRows = (j.data ?? []).map((r: any) => String(r.created_at).slice(0, 10));
      console.log(`[paid] submissions rows: ${subRows.length}`);
      console.log(`[paid] job_applications rows: ${jobRows.length}`);
      setSubs(subRows);
      setJobs(jobRows);
      setDbStatus("ready");
    });
    return () => {
      active = false;
    };
  }, [start, end]);

  const allCreatives = useMemo(() => creativesWithSessions(days, ga4Days), [days, ga4Days]);
  const creatives = useMemo(
    () =>
      campaign === "All"
        ? allCreatives
        : allCreatives.filter((c) => campaignProducts(campaign).includes(c.product)),
    [allCreatives, campaign]
  );

  const paidSubDates = useMemo(() => subs.filter((r) => PAID_SOURCES.includes(r.source)).map((r) => r.date), [subs]);

  const totalSubmissions = subs.length;
  const totalPaidSubmissions = paidSubDates.length;
  const totalJobApps = jobs.length;
  const totalSpend = metaTotals(days).spend;
  const costPerSub = totalSubmissions ? Math.round(totalSpend / totalSubmissions) : 0;
  const metaSessions = useMemo(
    () => ga4Days.filter((d) => d.channel === "paid").reduce((a, d) => a + d.sessions, 0),
    [ga4Days]
  );

  const trackerRows = [
    { key: "submissions" as const, label: "Submissions", actual: totalSubmissions, unit: "number" as Unit, lowerBetter: false },
    { key: "jobApplications" as const, label: "Job Applications", actual: totalJobApps, unit: "number" as Unit, lowerBetter: false },
    { key: "costPerSub" as const, label: "Cost per Sub ₫", actual: costPerSub, unit: "currency" as Unit, lowerBetter: true },
    { key: "budget" as const, label: "Budget ₫", actual: totalSpend, unit: "currency" as Unit, lowerBetter: true },
  ];

  const groupCards = (group: "Salary Page" | "Job Page") => {
    const t = metaTotals(filterByCampaign(days, group));
    const sessions = metaSessions;
    if (group === "Salary Page") {
      const subsCount = totalPaidSubmissions;
      return [
        { key: "spend", label: "Spend ₫", value: t.spend, unit: "currency" as Unit },
        { key: "sessions", label: "Sessions", value: sessions, unit: "number" as Unit },
        { key: "submissions", label: "Submissions", value: subsCount, unit: "number" as Unit },
        { key: "costsub", label: "Cost/Sub ₫", value: subsCount ? Math.round(t.spend / subsCount) : 0, unit: "currency" as Unit },
        { key: "ctr", label: "CTR%", value: t.ctr, unit: "percent" as Unit },
      ];
    }
    return [
      { key: "spend", label: "Spend ₫", value: t.spend, unit: "currency" as Unit },
      { key: "sessions", label: "Sessions", value: sessions, unit: "number" as Unit },
      { key: "jobapps", label: "Job Apps", value: totalJobApps, unit: "number" as Unit },
      { key: "costapp", label: "Cost/Job App ₫", value: totalJobApps ? Math.round(t.spend / totalJobApps) : 0, unit: "currency" as Unit },
      { key: "ctr", label: "CTR%", value: t.ctr, unit: "percent" as Unit },
    ];
  };

  const dates = useMemo(() => eachDay(start, end), [start, end]);
  const chartData = useMemo(() => {
    const sm = spendByDay(filterByCampaign(days, campaign));
    const subM = countByDay(paidSubDates);
    const jobM = countByDay(jobs);
    return dates.map((d) => ({
      date: d,
      spend: sm.get(d) ?? 0,
      submissions: subM.get(d) ?? 0,
      jobApps: jobM.get(d) ?? 0,
    }));
  }, [dates, days, campaign, paidSubDates, jobs]);

  const showSubmissions = campaign !== "Job Page";
  const showJobApps = campaign !== "Salary Page";

  const sortedCreatives = useMemo(() => {
    const arr = [...creatives];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr.slice(0, 10);
  }, [creatives, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "adName" || key === "audience" ? "asc" : "desc");
    }
  };

  const columns: { key: SortKey | "rank"; label: string; align: "left" | "right"; fmt?: (n: number) => string }[] = [
    { key: "rank", label: "Rank", align: "left" },
    { key: "adName", label: "Ad Name", align: "left" },
    { key: "audience", label: "Audience", align: "left" },
    { key: "spend", label: "Spend", align: "right", fmt: formatCurrency },
    { key: "sessions", label: "Sessions", align: "right", fmt: formatNumber },
    { key: "leads", label: campaign === "Job Page" ? "Job Apps" : "Submissions", align: "right", fmt: formatNumber },
    { key: "cpl", label: campaign === "Job Page" ? "Cost/App" : "Cost/Sub", align: "right", fmt: formatCurrency },
    { key: "ctr", label: "CTR", align: "right", fmt: formatPercent },
  ];

  const addAnnotation = () => {
    if (!annDate || !annLabel.trim()) return;
    setAnnotations([...annotations, { date: annDate, label: annLabel.trim() }]);
    setAnnLabel("");
  };

  const removeAnnotation = (i: number) => {
    setAnnotations(annotations.filter((_, idx) => idx !== i));
  };

  if (days.length === 0) {
    return (
      <EmptyState
        title="No paid data in range"
        message="No FYI meta campaigns found for the selected dates."
      />
    );
  }

  const rangeAnnotations = annotations.filter((a) => a.date >= start && a.date <= end);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Monthly Target Tracker</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-medium">Metric</th>
                <th className="pb-3 text-right font-medium">Target</th>
                <th className="pb-3 text-right font-medium">Actual</th>
                <th className="pb-3 text-right font-medium">Achievement %</th>
              </tr>
            </thead>
            <tbody>
              {trackerRows.map((row) => {
                const target = targets[row.key];
                const pct = achievement(row.actual, target, row.lowerBetter);
                return (
                  <tr key={row.key} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{row.label}</td>
                    <td className="py-3 text-right">
                      <input
                        type="number"
                        value={target}
                        onChange={(e) => setTargets({ ...targets, [row.key]: Number(e.target.value) })}
                        className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm text-slate-700 outline-none focus:border-purple-500"
                      />
                    </td>
                    <td className="py-3 text-right text-slate-600">{formatValue(row.actual, row.unit)}</td>
                    <td className="py-3 text-right">
                      <span className={["inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", achColor(pct)].join(" ")}>
                        {pct.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setCampaign(tab)}
            className={[
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              campaign === tab ? "bg-purple-600 text-white" : "text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="space-y-6">
        {(campaign === "All" || campaign === "Salary Page") && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Salary Page</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {groupCards("Salary Page").map((c) => (
                <Card key={c.key} label={c.label} value={c.value} unit={c.unit} />
              ))}
            </div>
          </div>
        )}
        {(campaign === "All" || campaign === "Job Page") && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Job Page</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {groupCards("Job Page").map((c) => (
                <Card key={c.key} label={c.label} value={c.value} unit={c.unit} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Daily Trend</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                labelFormatter={(d) => formatDateShort(String(d))}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar yAxisId="left" dataKey="spend" name="Ad Spend" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={18} />
              {showSubmissions && (
                <Line yAxisId="right" type="monotone" dataKey="submissions" name="Submissions" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
              )}
              {showJobApps && (
                <Line yAxisId="right" type="monotone" dataKey="jobApps" name="Job Apps" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
              )}
              {rangeAnnotations.map((a, i) => (
                <ReferenceLine
                  key={`${a.date}-${i}`}
                  yAxisId="left"
                  x={a.date}
                  stroke="#475569"
                  strokeDasharray="4 4"
                  label={{ value: a.label, position: "top", fontSize: 10, fill: "#475569" }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
              <input
                type="date"
                value={annDate}
                onChange={(e) => setAnnDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-medium text-slate-500">Policy label</label>
              <input
                type="text"
                value={annLabel}
                onChange={(e) => setAnnLabel(e.target.value)}
                placeholder="e.g. Budget increase"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={addAnnotation}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          {annotations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {annotations.map((a, i) => (
                <span key={`${a.date}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {formatDateShort(a.date)} · {a.label}
                  <button onClick={() => removeAnnotation(i)} className="text-slate-400 hover:text-slate-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Creative Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                {columns.map((col) => (
                  <th key={col.key} className={col.align === "right" ? "pb-3 text-right font-medium" : "pb-3 font-medium"}>
                    {col.key === "rank" ? (
                      col.label
                    ) : (
                      <button
                        onClick={() => toggleSort(col.key as SortKey)}
                        className={["inline-flex items-center gap-1 hover:text-slate-600", col.align === "right" ? "flex-row-reverse" : ""].join(" ")}
                      >
                        {col.label}
                        {sortKey === col.key &&
                          (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCreatives.map((c, i) => (
                <tr key={c.adName} className="border-b border-slate-50 last:border-0">
                  {columns.map((col) => {
                    if (col.key === "rank") {
                      return (
                        <td key={col.key} className="py-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                            {i + 1}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "adName") {
                      return (
                        <td key={col.key} className="max-w-[220px] truncate py-3 pr-3 font-medium text-slate-800">
                          {c.adName}
                        </td>
                      );
                    }
                    if (col.key === "audience") {
                      return (
                        <td key={col.key} className="py-3 pr-3 text-slate-500">
                          {c.audience || "—"}
                        </td>
                      );
                    }
                    const val = c[col.key] as number;
                    return (
                      <td key={col.key} className="py-3 text-right text-slate-600">
                        {col.fmt ? col.fmt(val) : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {sortedCreatives.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-6 text-center text-sm text-slate-400">
                    No creatives in range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {dbStatus === "connecting" && (
          <p className="mt-4 text-xs text-slate-400">Supabase not connected — submission and job application figures unavailable.</p>
        )}
      </section>
    </div>
  );
}
