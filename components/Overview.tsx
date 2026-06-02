"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Plus } from "lucide-react";
import { useDateRange } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import { Ga4Day, MetaDay, SnsPostRow } from "@/lib/realData";
import { PLATFORM_COLORS, filterByCampaign, inRange, metaTotals, paidCreatives, trafficTotals } from "@/lib/aggregate";
import { formatKRW, formatNumber, formatPercent, formatPeriod } from "@/lib/format";

const PAID_SOURCES = ["MT", "meta"];
const TARGETS_KEY = "fyi-monthly-targets";
const LOG_TYPES = ["Paid", "SNS", "Product"] as const;
const TYPE_COLOR: Record<string, string> = { Paid: "#BA7517", SNS: "#1D9E75", Product: "#534AB7" };

const TARGET_KPIS: { key: string; kind: "count" | "krw"; lowerBetter: boolean }[] = [
  { key: "Submissions", kind: "count", lowerBetter: false },
  { key: "Job apps", kind: "count", lowerBetter: false },
  { key: "CP Sub ₩", kind: "krw", lowerBetter: true },
  { key: "CP Job App ₩", kind: "krw", lowerBetter: true },
  { key: "Budget ₩", kind: "krw", lowerBetter: true },
];

const DEFAULT_TARGETS: Record<string, number> = {
  Submissions: 500,
  "Job apps": 200,
  "CP Sub ₩": 50000,
  "CP Job App ₩": 60000,
  "Budget ₩": 30000000,
};

const CR_BENCH = [
  { g: 0.02, a: 0.005 },
  { g: 0.5, a: 0.2 },
  { g: 0.1, a: 0.03 },
];

interface Note {
  date: string;
  type: string;
  note: string;
}

function dayMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function fmtTick(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dayStartISO(iso: string): string {
  return new Date(`${iso}T00:00:00`).toISOString();
}

function dayEndISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  while (cur <= last) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`);
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

function achClass(pct: number): string {
  if (pct >= 100) return "bg-emerald-50 text-emerald-700";
  if (pct >= 70) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function crClass(index: number, cr: number): string {
  const b = CR_BENCH[index] ?? { g: 0.5, a: 0.1 };
  if (cr >= b.g) return "bg-emerald-50 text-emerald-600";
  if (cr >= b.a) return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
}

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

function Card({ label, link, children }: { label?: string; link?: { href: string; text: string }; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-white" style={{ border: "0.5px solid #e2e8f0", padding: "11px 13px" }}>
      {label && (
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400">{label}</p>
          {link && (
            <Link href={link.href} className="text-[11px] font-medium text-purple-600 hover:text-purple-700">
              {link.text} →
            </Link>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function Wow({ value, previous, periodLabel }: { value: number | null; previous: number | null; periodLabel: string }) {
  if (value === null || previous === null || previous === 0) return <p className="mt-0.5 text-[10px] text-slate-300">vs {periodLabel}</p>;
  const pct = (value - previous) / previous;
  const up = pct >= 0;
  return (
    <p className={["mt-0.5 text-[10px]", up ? "text-emerald-600" : "text-red-500"].join(" ")}>
      {up ? "▲" : "▼"} {Math.abs(pct * 100).toFixed(0)}% vs {periodLabel}
    </p>
  );
}

interface Seg {
  name: string;
  value: number;
  color: string;
  rows: { name: string; value: number }[];
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const seg = payload[0].payload as Seg;
  return (
    <div style={{ background: "#ffffff", border: "0.5px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 11 }}>
      <p className="mb-1 font-medium text-slate-700">{seg.name}</p>
      {(seg.rows ?? []).map((r) => (
        <div key={r.name} className="flex justify-between gap-4">
          <span className="text-slate-500">{r.name}</span>
          <span className="font-bold tabular-nums text-slate-800">{formatNumber(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function DonutBlock({ data, total }: { data: Seg[]; total: number }) {
  return (
    <div>
      <div className="mx-auto" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<DonutTooltip />} cursor={false} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={36} outerRadius={56} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-slate-500">{d.name}</span>
            <span className="font-medium tabular-nums text-slate-700">
              {formatNumber(d.value)} · {total ? ((d.value / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Overview({ meta, ga4, sns, missingKey }: { meta: MetaDay[]; ga4: Ga4Day[]; sns: SnsPostRow[]; missingKey: boolean }) {
  const { start, end, previousStart, previousEnd } = useDateRange();
  const periodLabel = formatPeriod(previousStart, previousEnd);

  const days = useMemo(() => inRange(meta, start, end), [meta, start, end]);
  const prevDays = useMemo(() => inRange(meta, previousStart, previousEnd), [meta, previousStart, previousEnd]);
  const ga4Days = useMemo(() => inRange(ga4, start, end), [ga4, start, end]);
  const prevGa4 = useMemo(() => inRange(ga4, previousStart, previousEnd), [ga4, previousStart, previousEnd]);
  const snsDays = useMemo(() => inRange(sns, start, end), [sns, start, end]);

  const [targets, setTargets] = useLocalStorage<Record<string, number>>(TARGETS_KEY, DEFAULT_TARGETS);

  const [subs, setSubs] = useState<string[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [signups, setSignups] = useState<string[] | null>(null);
  const [prevSubs, setPrevSubs] = useState(0);
  const [prevJobs, setPrevJobs] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);

  const [noteType, setNoteType] = useState<(typeof LOG_TYPES)[number]>("Paid");
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState(start);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const lo = dayStartISO(start);
    const hi = dayEndISO(end);
    const plo = dayStartISO(previousStart);
    const phi = dayEndISO(previousEnd);
    Promise.all([
      supabase.from("submissions").select("created_at, source").gte("created_at", lo).lte("created_at", hi),
      supabase.from("job_applications").select("created_at").gte("created_at", lo).lte("created_at", hi),
      supabase.from("submissions").select("*", { count: "exact", head: true }).in("source", PAID_SOURCES).gte("created_at", plo).lte("created_at", phi),
      supabase.from("job_applications").select("*", { count: "exact", head: true }).gte("created_at", plo).lte("created_at", phi),
    ]).then(([s, j, ps, pj]) => {
      if (!active || s.error || j.error) return;
      const subRows = (s.data ?? []).map((r: any) => String(r.created_at).slice(0, 10));
      const jobRows = (j.data ?? []).map((r: any) => String(r.created_at).slice(0, 10));
      console.log(`[overview] submissions rows: ${subRows.length}`);
      console.log(`[overview] job_applications rows: ${jobRows.length}`);
      setSubs(subRows);
      setJobs(jobRows);
      setPrevSubs(ps.count ?? 0);
      setPrevJobs(pj.count ?? 0);
    });
    supabase
      .from("sign_ups")
      .select("created_at")
      .gte("created_at", lo)
      .lte("created_at", hi)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setSignups(null);
          return;
        }
        const rows = (data ?? []).map((r: any) => String(r.created_at).slice(0, 10));
        console.log(`[overview] sign_ups rows: ${rows.length}`);
        setSignups(rows);
      });
    return () => {
      active = false;
    };
  }, [start, end, previousStart, previousEnd]);

  const loadNotes = useCallback(() => {
    if (!supabase) return;
    supabase
      .from("optimization_log")
      .select("date, campaign, note")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn("[overview] optimization_log unavailable", error.message);
          return;
        }
        setNotes((data ?? []).map((r: any) => ({ date: String(r.date).slice(0, 10), type: r.campaign ?? "", note: r.note ?? "" })));
      });
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = async () => {
    setNoteError(null);
    if (!supabase) {
      setNoteError("Supabase not connected.");
      return;
    }
    if (!noteDate || !noteText.trim()) {
      setNoteError("Enter a date and note.");
      return;
    }
    const { error } = await supabase.from("optimization_log").insert({ date: noteDate, campaign: noteType, note: noteText.trim() });
    if (error) {
      setNoteError(error.message);
      return;
    }
    setNoteText("");
    loadNotes();
  };

  const t = metaTotals(days);
  const prevT = metaTotals(prevDays);
  const salarySpend = metaTotals(filterByCampaign(days, "Salary Page")).spend;
  const jobSpend = metaTotals(filterByCampaign(days, "Job Page")).spend;
  const prevSalarySpend = metaTotals(filterByCampaign(prevDays, "Salary Page")).spend;
  const prevJobSpend = metaTotals(filterByCampaign(prevDays, "Job Page")).spend;

  const traffic = trafficTotals(ga4Days);
  const prevTraffic = trafficTotals(prevGa4);

  const submissions = subs.length;
  const jobApps = jobs.length;
  const signupCount = signups ? signups.length : null;
  const cpSub = submissions ? Math.round(salarySpend / submissions) : 0;
  const cpJob = jobApps ? Math.round(jobSpend / jobApps) : 0;
  const prevCpSub = prevSubs ? Math.round(prevSalarySpend / prevSubs) : 0;
  const prevCpJob = prevJobs ? Math.round(prevJobSpend / prevJobs) : 0;

  const metrics: { label: string; value: number | null; prev: number | null; fmt: (n: number) => string }[] = [
    { label: "Total Spend ₩", value: t.spend, prev: prevT.spend, fmt: formatKRW },
    { label: "CTR%", value: t.ctr, prev: prevT.ctr, fmt: formatPercent },
    { label: "CP Sub ₩", value: cpSub, prev: prevCpSub, fmt: formatKRW },
    { label: "CP Job App ₩", value: cpJob, prev: prevCpJob, fmt: formatKRW },
    { label: "Total Sessions", value: traffic.total, prev: prevTraffic.total, fmt: formatNumber },
    { label: "Submissions", value: submissions, prev: prevSubs, fmt: formatNumber },
    { label: "Job Apps", value: jobApps, prev: prevJobs, fmt: formatNumber },
    { label: "Sign-ups", value: signupCount, prev: null, fmt: formatNumber },
  ];

  const dates = useMemo(() => eachDay(start, end), [start, end]);
  const startMs = dayMs(start);
  const endMs = dayMs(end);
  const chartData = useMemo(() => {
    const sm = spendByDay(days);
    const subM = countByDay(subs);
    const jobM = countByDay(jobs);
    const suM = signups ? countByDay(signups) : null;
    return dates
      .map((d) => ({ ts: dayMs(d), spend: sm.get(d) ?? 0, submissions: subM.get(d) ?? 0, jobApps: jobM.get(d) ?? 0, signups: suM ? suM.get(d) ?? 0 : 0 }))
      .filter((p) => p.ts >= startMs && p.ts <= endMs);
  }, [dates, days, subs, jobs, signups, startMs, endMs]);

  const rangeNotes = notes.filter((n) => n.date >= start && n.date <= end);
  const recentNotes = rangeNotes.slice(0, 5);

  const actuals: Record<string, number> = {
    Submissions: submissions,
    "Job apps": jobApps,
    "CP Sub ₩": cpSub,
    "CP Job App ₩": cpJob,
    "Budget ₩": t.spend,
  };

  const sumClicks = (ds: MetaDay[]) => ds.reduce((a, d) => a + d.clicks, 0);
  const salaryClicks = sumClicks(filterByCampaign(days, "Salary Page"));
  const jobClicks = sumClicks(filterByCampaign(days, "Job Page"));
  const clickDenom = salaryClicks + jobClicks;
  const salaryRatio = clickDenom ? salaryClicks / clickDenom : 0;
  const jobRatio = clickDenom ? jobClicks / clickDenom : 0;
  const salarySessions = Math.round(traffic.paid * salaryRatio);
  const jobSessions = clickDenom ? traffic.paid - salarySessions : 0;
  const otherSessions = Math.max(0, traffic.total - traffic.paid);

  const sessBySource = new Map<string, number>();
  for (const d of ga4Days) sessBySource.set(d.source, (sessBySource.get(d.source) ?? 0) + d.sessions);
  const srcVal = (s: string) => sessBySource.get(s) ?? 0;
  const directS = srcVal("direct");
  const referralS = srcVal("referral");
  const otherBucket = Math.max(0, traffic.other - directS - referralS);
  const topSources = [...sessBySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, value]) => ({ name, value }));

  const clicksOf = (p: string) => days.filter((d) => d.product === p).reduce((a, d) => a + d.clicks, 0);
  const aprC = clicksOf("April");
  const ktC = clicksOf("K-Tuvi");
  const jpC = clicksOf("Job-page");
  const prodDenom = aprC + ktC + jpC || 1;
  const paidProd = (c: number) => Math.round((traffic.paid * c) / prodDenom);

  const sessionDonut: Seg[] = [
    {
      name: "Salary page",
      value: salarySessions,
      color: "#7F77DD",
      rows: [
        { name: "Paid", value: Math.round(traffic.paid * salaryRatio) },
        { name: "Organic SNS", value: Math.round(traffic.organic * salaryRatio) },
        { name: "Direct", value: Math.round(directS * salaryRatio) },
      ],
    },
    {
      name: "Job page",
      value: jobSessions,
      color: "#1D9E75",
      rows: [
        { name: "Paid", value: Math.round(traffic.paid * jobRatio) },
        { name: "Organic SNS", value: Math.round(traffic.organic * jobRatio) },
        { name: "Direct", value: Math.round(directS * jobRatio) },
      ],
    },
    { name: "Other", value: otherSessions, color: "#94a3b8", rows: topSources },
  ];

  const trafficDonut: Seg[] = [
    {
      name: "Paid (Meta)",
      value: traffic.paid,
      color: "#7F77DD",
      rows: [
        { name: "April", value: paidProd(aprC) },
        { name: "K-Tuvi", value: paidProd(ktC) },
        { name: "Job-page", value: paidProd(jpC) },
      ],
    },
    {
      name: "Organic SNS",
      value: traffic.organic,
      color: "#1D9E75",
      rows: [
        { name: "Threads", value: srcVal("threads") },
        { name: "Facebook", value: srcVal("facebook") },
        { name: "Instagram", value: srcVal("instagram") },
      ],
    },
    {
      name: "Direct & other",
      value: traffic.other,
      color: "#94a3b8",
      rows: [
        { name: "Direct", value: directS },
        { name: "Referral", value: referralS },
        { name: "Other", value: otherBucket },
      ],
    },
  ];

  const stages = [
    { label: "Impressions", value: days.reduce((a, d) => a + d.impressions, 0) },
    { label: "Clicks", value: days.reduce((a, d) => a + d.clicks, 0) },
    { label: "Sessions", value: traffic.total },
    { label: "Subs + Apps", value: submissions + jobApps },
  ];
  const funnelMax = stages[0].value || 1;

  const bestCreative = paidCreatives(days)[0];
  const bestPost = [...snsDays].sort((a, b) => b.views - a.views)[0];

  return (
    <div className="space-y-3">
      {missingKey && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          GOOGLE_SHEETS_API_KEY is missing — live data may be unavailable.
        </div>
      )}

      <div className="grid items-start gap-3" style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}>
        <div className="space-y-3">
          <Card label="Monthly target progress">
            <div className="space-y-3">
              {[
                { key: "Submissions", actual: submissions, color: "#7c3aed" },
                { key: "Job apps", actual: jobApps, color: "#14b8a6" },
              ].map((b) => {
                const target = targets[b.key] ?? 0;
                const pct = target ? (b.actual / target) * 100 : 0;
                return (
                  <div key={b.key}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{b.key}</span>
                      <span className="font-medium tabular-nums text-slate-700">
                        {formatNumber(b.actual)} / {formatNumber(target)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: b.color }} />
                      </div>
                      <span className={["rounded-full px-1.5 py-0.5 text-[10px] font-medium", achClass(pct)].join(" ")}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card label="Key metrics">
            <div className="grid grid-cols-4" style={{ gap: 10 }}>
              {metrics.map((m) => (
                <div key={m.label} className="rounded-md bg-slate-50" style={{ padding: "9px 11px" }}>
                  <p className="text-[11px] text-slate-400">{m.label}</p>
                  <p className="mt-0.5 text-[18px] font-medium leading-tight text-slate-900">{m.value === null ? "—" : m.fmt(m.value)}</p>
                  <Wow value={m.value} previous={m.prev} periodLabel={periodLabel} />
                </div>
              ))}
            </div>
          </Card>

          <Card label="Daily trend">
            <div className="w-full" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />
                  <XAxis dataKey="ts" type="number" scale="time" domain={[startMs, endMs]} tickFormatter={fmtTick} tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip labelFormatter={(d) => fmtTick(Number(d))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e2e8f0", fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="spend" name="Spend" fill="#cbd5e1" radius={[3, 3, 0, 0]} barSize={12} />
                  <Line yAxisId="right" type="monotone" dataKey="submissions" name="Submissions" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="jobApps" name="Job apps" stroke="#14b8a6" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  {signups && <Line yAxisId="right" type="monotone" dataKey="signups" name="Sign-ups" stroke="#2563eb" strokeWidth={2} strokeDasharray="2 3" dot={false} />}
                  {rangeNotes.map((n, i) => (
                    <ReferenceLine key={`${n.date}-${i}`} yAxisId="left" x={dayMs(n.date)} stroke={TYPE_COLOR[n.type] ?? "#94a3b8"} strokeDasharray="4 4" />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card label="Optimization log" link={{ href: "/paid", text: "View all" }}>
            <div className="space-y-2">
              {recentNotes.length === 0 && <p className="text-xs text-slate-400">No notes in range.</p>}
              {recentNotes.map((n, i) => (
                <div key={`${n.date}-${i}`} className="rounded-r-md bg-slate-50 px-3 py-1.5" style={{ borderLeftWidth: 2, borderLeftStyle: "solid", borderLeftColor: TYPE_COLOR[n.type] ?? "#94a3b8" }}>
                  <p className="text-[10px] text-slate-400">
                    {fmtTick(dayMs(n.date))} · {n.type || "—"}
                  </p>
                  <p className="text-xs text-slate-700">{n.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as (typeof LOG_TYPES)[number])}
                className="rounded-md px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
                style={{ border: "0.5px solid #e2e8f0" }}
              >
                {LOG_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an optimization note"
                className="min-w-[140px] flex-1 rounded-md px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
                style={{ border: "0.5px solid #e2e8f0" }}
              />
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="rounded-md px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
                style={{ border: "0.5px solid #e2e8f0" }}
              />
              <button onClick={addNote} className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            {noteError && <p className="mt-2 text-[11px] text-red-500">{noteError}</p>}
          </Card>
        </div>

        <div className="space-y-3">
          <Card label="Monthly targets">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400">
                  <th className="pb-2 font-medium">KPI</th>
                  <th className="pb-2 text-right font-medium">Target</th>
                  <th className="pb-2 text-right font-medium">Actual</th>
                  <th className="pb-2 text-right font-medium">Ach.</th>
                </tr>
              </thead>
              <tbody>
                {TARGET_KPIS.map((kpi, i) => {
                  const target = targets[kpi.key] ?? 0;
                  const actual = actuals[kpi.key] ?? 0;
                  const pct = achievement(actual, target, kpi.lowerBetter);
                  return (
                    <tr key={kpi.key} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                      <td className="py-1.5 text-slate-700">{kpi.key}</td>
                      <td className="py-1.5 text-right">
                        <input
                          type="number"
                          value={target}
                          onChange={(e) => setTargets({ ...targets, [kpi.key]: Number(e.target.value) })}
                          className="w-20 rounded-md px-1.5 py-1 text-right text-xs text-slate-700 outline-none focus:border-purple-500"
                          style={{ border: "0.5px solid #e2e8f0" }}
                        />
                      </td>
                      <td className="py-1.5 text-right text-slate-600">{kpi.kind === "krw" ? formatKRW(actual) : formatNumber(actual)}</td>
                      <td className="py-1.5 text-right">
                        <span className={["inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", achClass(pct)].join(" ")}>{pct.toFixed(0)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-2.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Card label="Sessions by page">
              <DonutBlock data={sessionDonut} total={traffic.total} />
            </Card>
            <Card label="Traffic breakdown">
              <DonutBlock data={trafficDonut} total={traffic.total} />
            </Card>
          </div>

          <Card label="Funnel snapshot" link={{ href: "/funnel", text: "View full funnel" }}>
            <div className="space-y-1.5">
              {stages.map((stage, i) => {
                const next = stages[i + 1];
                const cr = next && stage.value ? next.value / stage.value : 0;
                return (
                  <div key={stage.label}>
                    <div className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-[11px] text-slate-500">{stage.label}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-purple-600" style={{ width: `${((stage.value / funnelMax) * 100).toFixed(1)}%` }} />
                      </div>
                      <span className="w-16 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-700">{formatNumber(stage.value)}</span>
                    </div>
                    {next && (
                      <div className="flex justify-center py-0.5">
                        <span className={["rounded-full px-1.5 py-0.5 text-[9px] font-medium", crClass(i, cr)].join(" ")}>↓ {formatPercent(cr)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card label="Quick glance">
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-slate-600">Best paid creative</p>
                  <Link href="/paid" className="text-[10px] font-medium text-purple-600 hover:text-purple-700">View all →</Link>
                </div>
                {bestCreative ? (
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="truncate text-xs font-medium text-slate-800">{bestCreative.adName}</p>
                    <div className="mt-1 flex gap-4 text-[10px] text-slate-500">
                      <span>Subs {formatNumber(bestCreative.leads)}</span>
                      <span>CP Sub {formatKRW(bestCreative.cpl)}</span>
                      <span>CTR {formatPercent(bestCreative.ctr)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">No data in range.</p>
                )}
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-slate-600">Best organic post</p>
                  <Link href="/sns" className="text-[10px] font-medium text-purple-600 hover:text-purple-700">View all →</Link>
                </div>
                {bestPost ? (
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: PLATFORM_COLORS[bestPost.platform] }}>
                        {bestPost.platform}
                      </span>
                      <span className="truncate text-xs font-medium text-slate-800">{bestPost.pillar}</span>
                    </div>
                    <div className="mt-1 flex gap-4 text-[10px] text-slate-500">
                      <span>Views {formatNumber(bestPost.views)}</span>
                      <span>ER {formatPercent(bestPost.views ? bestPost.interactions / bestPost.views : 0)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">No data in range.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
