"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
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
import { formatDateShort, formatKRW, formatNumber, formatPercent } from "@/lib/format";

const PAID_SOURCES = ["MT", "meta"];
const TABS: Campaign[] = ["All", "Salary Page", "Job Page"];
const CREATIVE_TABS = ["Salary Page", "Job Page"] as const;

const TARGET_KPIS: { key: string; kind: "count" | "vnd"; lowerBetter: boolean }[] = [
  { key: "Submissions", kind: "count", lowerBetter: false },
  { key: "Job apps", kind: "count", lowerBetter: false },
  { key: "Cost/sub", kind: "vnd", lowerBetter: true },
  { key: "Cost/job app", kind: "vnd", lowerBetter: true },
  { key: "Budget", kind: "vnd", lowerBetter: true },
];

const DEFAULT_TARGETS: Record<string, number> = {
  Submissions: 500,
  "Job apps": 200,
  "Cost/sub": 50000,
  "Cost/job app": 60000,
  Budget: 30000000,
};

type SortKey = "adName" | "audience" | "spend" | "sessions" | "leads" | "cpl" | "ctr";

interface Note {
  date: string;
  note: string;
}

/*
CREATE TABLE optimization_log (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  campaign text,
  note text,
  author text,
  created_at timestamptz default now()
);

CREATE TABLE monthly_targets (
  id uuid default gen_random_uuid() primary key,
  month date not null,
  kpi text not null,
  target numeric,
  created_at timestamptz default now()
);
*/

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

async function fetchRows(table: string, lo: string, hi: string, columns: string): Promise<{ date: string; source: string }[] | null> {
  if (!supabase) return null;
  const out: { date: string; source: string }[] = [];
  const size = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gte("created_at", lo)
      .lte("created_at", hi)
      .order("created_at", { ascending: true })
      .range(from, from + size - 1);
    if (error) {
      console.warn(`[paid] ${table} (${columns}) fetch error: ${error.message}`);
      return null;
    }
    const rows = data ?? [];
    for (const r of rows) out.push({ date: String((r as any).created_at).slice(0, 10), source: String((r as any).source ?? "") });
    if (rows.length < size) break;
    from += size;
  }
  return out;
}

async function countRows(table: string, lo: string, hi: string, mod?: (q: any) => any): Promise<number> {
  if (!supabase) return 0;
  let q: any = supabase.from(table).select("*", { count: "exact", head: true }).gte("created_at", lo).lte("created_at", hi);
  if (mod) q = mod(q);
  const { count, error } = await q;
  return error ? 0 : count ?? 0;
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

function noteColor(note: string): string {
  const t = note.toLowerCase();
  if (t.includes("audience")) return "#7c3aed";
  if (t.includes("creative")) return "#14b8a6";
  return "#f59e0b";
}

function markerLabel(note: string): string {
  return note.length > 16 ? `${note.slice(0, 16)}…` : note;
}

function NoteLabel(props: any) {
  const { viewBox, value, row, color } = props;
  if (!viewBox) return null;
  return (
    <text x={viewBox.x} y={viewBox.y + 6 + (row ?? 0) * 11} textAnchor="middle" fontSize={9} fill={color}>
      {value}
    </text>
  );
}

function audienceBreakdown(days: MetaDay[]) {
  const m = new Map<string, { spend: number; leads: number }>();
  for (const d of days) {
    const key = d.audience || "—";
    const a = m.get(key) ?? { spend: 0, leads: 0 };
    a.spend += d.spend;
    a.leads += d.leads;
    m.set(key, a);
  }
  return [...m.entries()]
    .map(([segment, a]) => ({ segment, spend: a.spend, cpl: a.leads ? Math.round(a.spend / a.leads) : 0 }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 6);
}

function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border-slate-200 bg-white px-4 py-3.5" style={{ borderWidth: 0.5, borderStyle: "solid" }}>
      {label && <p className="mb-2.5 text-[10px] font-normal uppercase tracking-[0.06em] text-slate-400">{label}</p>}
      {children}
    </div>
  );
}

function Wow({ value, previous }: { value: number; previous: number | null }) {
  if (previous === null || previous === 0) return <p className="text-[10px] text-slate-300">vs prev —</p>;
  const pct = (value - previous) / previous;
  const up = pct >= 0;
  return (
    <p className={["text-[10px]", up ? "text-emerald-600" : "text-red-500"].join(" ")}>
      {up ? "▲" : "▼"} {Math.abs(pct * 100).toFixed(0)}%
    </p>
  );
}

export default function PaidView({ meta, ga4 }: { meta: MetaDay[]; ga4: Ga4Day[] }) {
  const { start, end, previousStart, previousEnd } = useDateRange();
  const days = useMemo(() => inRange(meta, start, end), [meta, start, end]);
  const ga4Days = useMemo(() => inRange(ga4, start, end), [ga4, start, end]);
  const prevDays = useMemo(() => inRange(meta, previousStart, previousEnd), [meta, previousStart, previousEnd]);
  const prevGa4 = useMemo(() => inRange(ga4, previousStart, previousEnd), [ga4, previousStart, previousEnd]);
  const monthKey = `${start.slice(0, 7)}-01`;

  const [campaign, setCampaign] = useState<Campaign>("All");
  const [creativeTab, setCreativeTab] = useState<(typeof CREATIVE_TABS)[number]>("Salary Page");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [subRows, setSubRows] = useState<{ date: string; source: string }[]>([]);
  const [jobRows, setJobRows] = useState<{ date: string; source: string }[]>([]);
  const [prevSubPaid, setPrevSubPaid] = useState(0);
  const [prevJobAll, setPrevJobAll] = useState(0);
  const [prevJobFiltered, setPrevJobFiltered] = useState(0);
  const [dbStatus, setDbStatus] = useState<"loading" | "connecting" | "ready">("loading");

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDate, setNoteDate] = useState(start);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const [targets, setTargets] = useState<Record<string, number>>(DEFAULT_TARGETS);

  useEffect(() => {
    if (!supabase) {
      setDbStatus("connecting");
      return;
    }
    let active = true;
    setDbStatus("loading");
    const lo = dayStartISO(start);
    const hi = dayEndISO(end);
    const plo = dayStartISO(previousStart);
    const phi = dayEndISO(previousEnd);
    (async () => {
      const [subRaw, pSub, pJobAll, pJobFiltered] = await Promise.all([
        fetchRows("submissions", lo, hi, "created_at, source"),
        countRows("submissions", plo, phi, (q) => q.in("source", PAID_SOURCES)),
        countRows("job_applications", plo, phi),
        countRows("job_applications", plo, phi, (q) => q.or("source.eq.meta,source.is.null")),
      ]);
      let jobRaw = await fetchRows("job_applications", lo, hi, "created_at, source");
      if (!jobRaw) jobRaw = await fetchRows("job_applications", lo, hi, "created_at");
      if (!active) return;
      if (subRaw) {
        console.log(`[paid] submissions rows: ${subRaw.length}`);
        setSubRows(subRaw);
      }
      if (jobRaw) {
        console.log(`[paid] job_applications rows: ${jobRaw.length}`);
        setJobRows(jobRaw);
      }
      setPrevSubPaid(pSub);
      setPrevJobAll(pJobAll);
      setPrevJobFiltered(pJobFiltered);
      setDbStatus(subRaw || jobRaw ? "ready" : "connecting");
    })();
    return () => {
      active = false;
    };
  }, [start, end, previousStart, previousEnd]);

  const loadNotes = useCallback(() => {
    if (!supabase) return;
    supabase
      .from("optimization_log")
      .select("date, note")
      .eq("page", "paid")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn("[paid] optimization_log unavailable", error.message);
          return;
        }
        console.log(`[paid] optimization_log rows: ${(data ?? []).length}`);
        setNotes((data ?? []).map((r: any) => ({ date: String(r.date).slice(0, 10), note: r.note ?? "" })));
      });
  }, []);

  const loadTargets = useCallback(() => {
    if (!supabase) return;
    supabase
      .from("monthly_targets")
      .select("kpi, target")
      .eq("month", monthKey)
      .then(({ data, error }) => {
        if (error) {
          console.warn("[paid] monthly_targets unavailable", error.message);
          return;
        }
        const next = { ...DEFAULT_TARGETS };
        for (const r of data ?? []) if (r.kpi in next) next[r.kpi] = Number(r.target);
        setTargets(next);
      });
  }, [monthKey]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const allCreatives = useMemo(() => creativesWithSessions(days, ga4Days), [days, ga4Days]);

  const paidSubRows = subRows.filter((r) => ["mt", "meta"].includes(r.source.toLowerCase()));
  const paidSubmissions = paidSubRows.length;
  const jobAppsAll = jobRows.length;
  const jobAppsFiltered = jobRows.filter((j) => j.source.toLowerCase() === "meta" || j.source === "").length;

  const metaSess = (g: Ga4Day[], lp?: string) =>
    g.filter((d) => d.source === "meta" && (lp === undefined || d.landingPage === lp)).reduce((a, d) => a + d.sessions, 0);
  const salarySessions = metaSess(ga4Days, "/");
  const jobSessions = metaSess(ga4Days, "/jobs");
  const allMetaSessions = metaSess(ga4Days);
  const prevSalarySessions = metaSess(prevGa4, "/");
  const prevJobSessions = metaSess(prevGa4, "/jobs");
  const prevAllMetaSessions = metaSess(prevGa4);

  const salaryT = metaTotals(filterByCampaign(days, "Salary Page"));
  const jobT = metaTotals(filterByCampaign(days, "Job Page"));
  const allT = metaTotals(days);
  const prevSalaryT = metaTotals(filterByCampaign(prevDays, "Salary Page"));
  const prevJobT = metaTotals(filterByCampaign(prevDays, "Job Page"));
  const prevAllT = metaTotals(prevDays);

  const cdiv = (a: number, b: number) => (b ? Math.round(a / b) : 0);

  const cards =
    campaign === "Salary Page"
      ? [
          { label: "Spend ₩", value: salaryT.spend, kind: "krw", prev: prevSalaryT.spend },
          { label: "Sessions", value: salarySessions, kind: "count", prev: prevSalarySessions },
          { label: "Submissions", value: paidSubmissions, kind: "count", prev: prevSubPaid },
          { label: "Cost/sub", value: cdiv(salaryT.spend, paidSubmissions), kind: "krw", prev: cdiv(prevSalaryT.spend, prevSubPaid) },
          { label: "CTR%", value: salaryT.ctr, kind: "pct", prev: prevSalaryT.ctr },
        ]
      : campaign === "Job Page"
      ? [
          { label: "Spend ₩", value: jobT.spend, kind: "krw", prev: prevJobT.spend },
          { label: "Sessions", value: jobSessions, kind: "count", prev: prevJobSessions },
          { label: "Job Applications", value: jobAppsFiltered, kind: "count", prev: prevJobFiltered },
          { label: "Cost/job app", value: cdiv(jobT.spend, jobAppsFiltered), kind: "krw", prev: cdiv(prevJobT.spend, prevJobFiltered) },
          { label: "CTR%", value: jobT.ctr, kind: "pct", prev: prevJobT.ctr },
        ]
      : [
          { label: "Spend ₩", value: allT.spend, kind: "krw", prev: prevAllT.spend },
          { label: "Sessions", value: allMetaSessions, kind: "count", prev: prevAllMetaSessions },
          { label: "Submissions", value: paidSubmissions, kind: "count", prev: prevSubPaid },
          { label: "Job Apps", value: jobAppsAll, kind: "count", prev: prevJobAll },
          { label: "Cost/sub", value: cdiv(salaryT.spend, paidSubmissions), kind: "krw", prev: cdiv(prevSalaryT.spend, prevSubPaid) },
          { label: "CTR%", value: allT.ctr, kind: "pct", prev: prevAllT.ctr },
        ];

  const fmt = (v: number, kind: string) => (kind === "krw" ? formatKRW(v) : kind === "pct" ? (v * 100).toFixed(2) : formatNumber(v));

  const actuals: Record<string, number> = {
    Submissions: paidSubmissions,
    "Job apps": jobAppsAll,
    "Cost/sub": cdiv(salaryT.spend, paidSubmissions),
    "Cost/job app": cdiv(jobT.spend, jobAppsAll),
    Budget: allT.spend,
  };

  const dates = useMemo(() => eachDay(start, end), [start, end]);
  const startMs = dayMs(start);
  const endMs = dayMs(end);
  const chartData = useMemo(() => {
    const sm = spendByDay(filterByCampaign(days, campaign));
    const subM = countByDay(subRows.filter((r) => ["mt", "meta"].includes(r.source.toLowerCase())).map((r) => r.date));
    const jobM = countByDay(jobRows.map((j) => j.date));
    return dates
      .map((d) => ({ ts: dayMs(d), date: d, spend: sm.get(d) ?? 0, submissions: subM.get(d) ?? 0, jobApps: jobM.get(d) ?? 0 }))
      .filter((p) => p.ts >= startMs && p.ts <= endMs);
  }, [dates, days, campaign, subRows, jobRows, startMs, endMs]);

  const rangeNotes = notes.filter((n) => n.date >= start && n.date <= end);
  const markerRowSeen = new Map<string, number>();
  const markers = rangeNotes.map((n) => {
    const row = markerRowSeen.get(n.date) ?? 0;
    markerRowSeen.set(n.date, row + 1);
    return { date: n.date, note: n.note, row: row % 3, color: noteColor(n.note) };
  });

  const creatives = useMemo(
    () => allCreatives.filter((c) => campaignProducts(creativeTab).includes(c.product)),
    [allCreatives, creativeTab]
  );
  const sortedCreatives = useMemo(() => {
    const arr = [...creatives];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr.slice(0, 10);
  }, [creatives, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "adName" || key === "audience" ? "asc" : "desc");
    }
  };

  const creativeColumns: { key: SortKey | "rank"; label: string; align: "left" | "right"; fmt?: (n: number) => string }[] = [
    { key: "rank", label: "Rank", align: "left" },
    { key: "adName", label: "Ad name", align: "left" },
    { key: "audience", label: "Audience", align: "left" },
    { key: "spend", label: "Spend", align: "right", fmt: formatKRW },
    { key: "sessions", label: "Sessions", align: "right", fmt: formatNumber },
    { key: "leads", label: creativeTab === "Job Page" ? "Job apps" : "Subs", align: "right", fmt: formatNumber },
    { key: "cpl", label: creativeTab === "Job Page" ? "Cost/app" : "Cost/sub", align: "right", fmt: formatKRW },
    { key: "ctr", label: "CTR", align: "right", fmt: formatPercent },
  ];

  const audience = useMemo(() => audienceBreakdown(filterByCampaign(days, campaign)), [days, campaign]);
  const audienceMax = Math.max(1, ...audience.map((a) => a.spend));

  const saveTarget = useCallback(
    async (kpi: string, value: number) => {
      if (!supabase) return;
      const { data } = await supabase.from("monthly_targets").select("id").eq("month", monthKey).eq("kpi", kpi).limit(1);
      if (data && data.length) await supabase.from("monthly_targets").update({ target: value }).eq("id", data[0].id);
      else await supabase.from("monthly_targets").insert({ month: monthKey, kpi, target: value });
    },
    [monthKey]
  );

  const addNote = async () => {
    setNoteError(null);
    if (!supabase) {
      setNoteError("Supabase chưa kết nối.");
      return;
    }
    if (!noteDate || !noteText.trim()) {
      setNoteError("Nhập ngày và nội dung note.");
      return;
    }
    const { error } = await supabase.from("optimization_log").insert({ date: noteDate, page: "paid", note: noteText.trim() });
    if (error) {
      setNoteError(error.message);
      return;
    }
    setNoteText("");
    loadNotes();
  };

  if (days.length === 0) {
    return <EmptyState title="No paid data in range" message="No FYI meta campaigns found for the selected dates." />;
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-3/5 space-y-4">
        <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setCampaign(tab)}
              className={[
                "rounded-md px-3 py-1 text-xs font-normal transition-colors",
                campaign === tab ? "border-slate-200 bg-white text-slate-900" : "border-transparent text-slate-500",
              ].join(" ")}
              style={{ borderWidth: 0.5, borderStyle: "solid" }}
            >
              {tab}
            </button>
          ))}
        </div>

        <Section label="Metrics">
          <div className="grid grid-cols-3 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-md bg-slate-50 p-3">
                <p className="text-[11px] font-normal text-slate-400">{c.label}</p>
                <p className="mt-0.5 text-[20px] font-medium leading-tight text-slate-900">{fmt(c.value, c.kind)}</p>
                <div className="mt-1">
                  <Wow value={c.value} previous={c.prev} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section label="Daily trend">
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="ts" type="number" scale="time" domain={[startMs, endMs]} tickFormatter={fmtTick} tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip labelFormatter={(d) => fmtTick(Number(d))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e2e8f0", fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="spend" name="Spend" fill="#cbd5e1" radius={[3, 3, 0, 0]} barSize={14} />
                <Line yAxisId="right" type="monotone" dataKey="submissions" name="Submissions" stroke="#7c3aed" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="jobApps" name="Job apps" stroke="#14b8a6" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                {markers.map((m, i) => (
                  <ReferenceLine
                    key={`${m.date}-${i}`}
                    yAxisId="left"
                    x={dayMs(m.date)}
                    stroke={m.color}
                    strokeDasharray="4 4"
                    label={<NoteLabel value={markerLabel(m.note)} row={m.row} color={m.color} />}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section label="Optimization log">
          <div className="space-y-2">
            {notes.length === 0 && <p className="text-xs text-slate-400">No notes yet.</p>}
            {notes.map((n, i) => (
              <div key={`${n.date}-${i}`} className="rounded-r-md bg-slate-50 px-3 py-2" style={{ borderLeftWidth: 2, borderLeftStyle: "solid", borderLeftColor: noteColor(n.note) }}>
                <p className="text-[10px] font-normal text-slate-400">{formatDateShort(n.date)}</p>
                <p className="text-xs font-normal text-slate-700">{n.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-end gap-2">
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="rounded-md border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
              style={{ borderWidth: 0.5, borderStyle: "solid" }}
            />
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an optimization note"
              className="flex-1 rounded-md border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
              style={{ borderWidth: 0.5, borderStyle: "solid" }}
            />
            <button onClick={addNote} className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-normal text-white hover:bg-purple-700">
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          {noteError && <p className="mt-2 text-[11px] text-red-500">{noteError}</p>}
        </Section>
      </div>

      <div className="w-2/5 space-y-4">
        <Section label="Monthly targets">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-normal uppercase tracking-[0.06em] text-slate-400">
                <th className="pb-2 font-normal">KPI</th>
                <th className="pb-2 text-right font-normal">Target</th>
                <th className="pb-2 text-right font-normal">Actual</th>
                <th className="pb-2 text-right font-normal">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {TARGET_KPIS.map((kpi, i) => {
                const target = targets[kpi.key] ?? 0;
                const actual = actuals[kpi.key] ?? 0;
                const pct = achievement(actual, target, kpi.lowerBetter);
                return (
                  <tr key={kpi.key} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                    <td className="py-1.5 font-normal text-slate-700">{kpi.key}</td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        value={target}
                        onChange={(e) => setTargets({ ...targets, [kpi.key]: Number(e.target.value) })}
                        onBlur={(e) => saveTarget(kpi.key, Number(e.target.value))}
                        className="w-24 rounded-md border-slate-200 px-2 py-1 text-right text-xs text-slate-700 outline-none focus:border-purple-500"
                        style={{ borderWidth: 0.5, borderStyle: "solid" }}
                      />
                    </td>
                    <td className="py-1.5 text-right text-slate-600">{kpi.kind === "vnd" ? formatKRW(actual) : formatNumber(actual)}</td>
                    <td className="py-1.5 text-right">
                      <span className={["inline-flex rounded-full px-2 py-0.5 text-[10px] font-normal", achClass(pct)].join(" ")}>{pct.toFixed(0)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section label="Creative performance">
          <div className="mb-3 inline-flex gap-1 rounded-lg bg-slate-100 p-1">
            {CREATIVE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setCreativeTab(tab)}
                className={[
                  "rounded-md px-3 py-1 text-xs font-normal transition-colors",
                  creativeTab === tab ? "border-slate-200 bg-white text-slate-900" : "border-transparent text-slate-500",
                ].join(" ")}
                style={{ borderWidth: 0.5, borderStyle: "solid" }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-normal uppercase tracking-[0.06em] text-slate-400">
                  {creativeColumns.map((col) => (
                    <th key={col.key} className={col.align === "right" ? "pb-2 text-right font-normal" : "pb-2 font-normal"}>
                      {col.key === "rank" ? (
                        col.label
                      ) : (
                        <button onClick={() => toggleSort(col.key as SortKey)} className={["inline-flex items-center gap-0.5 hover:text-slate-600", col.align === "right" ? "flex-row-reverse" : ""].join(" ")}>
                          {col.label}
                          {sortKey === col.key && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCreatives.map((c, i) => (
                  <tr key={c.adName} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                    {creativeColumns.map((col) => {
                      if (col.key === "rank") return <td key={col.key} className="py-1.5 text-slate-400">{i + 1}</td>;
                      if (col.key === "adName") return <td key={col.key} className="max-w-[120px] truncate py-1.5 pr-2 font-normal text-slate-700">{c.adName}</td>;
                      if (col.key === "audience") return <td key={col.key} className="py-1.5 pr-2 text-slate-500">{c.audience || "—"}</td>;
                      const val = c[col.key] as number;
                      return <td key={col.key} className="py-1.5 text-right text-slate-600">{col.fmt ? col.fmt(val) : val}</td>;
                    })}
                  </tr>
                ))}
                {sortedCreatives.length === 0 && (
                  <tr>
                    <td colSpan={creativeColumns.length} className="py-4 text-center text-slate-400">No creatives in range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section label="Audience breakdown">
          <div className="space-y-3">
            {audience.length === 0 && <p className="text-xs text-slate-400">No audience data.</p>}
            {audience.map((a) => (
              <div key={a.segment} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs font-normal text-slate-600">{a.segment}</span>
                <div className="flex-1">
                  <div className="rounded-full" style={{ height: 6, width: `${(a.spend / audienceMax) * 100}%`, backgroundColor: "#7c3aed" }} />
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-600">{formatKRW(a.cpl)} CPL</span>
              </div>
            ))}
          </div>
        </Section>

        {dbStatus === "connecting" && <p className="text-[10px] text-slate-400">Supabase not connected — submissions, job applications, targets and notes unavailable.</p>}
      </div>
    </div>
  );
}
