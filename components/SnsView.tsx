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
import { ExternalLink, Plus } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import { Ga4Day, SnsPlatform, SnsPostRow } from "@/lib/realData";
import {
  PLATFORM_COLORS,
  PlatformTab,
  inRange,
  pillarHeatmap,
  snsMetrics,
  snsPlatforms,
  snsTotals,
} from "@/lib/aggregate";
import { Unit, formatNumber, formatPercent, formatValue } from "@/lib/format";

const PLATFORM_SOURCE: Record<string, string> = { Facebook: "facebook", Instagram: "instagram", Threads: "threads" };
const ORGANIC = new Set(["facebook", "instagram", "threads"]);

interface Cell {
  pillar: string;
  platform: SnsPlatform;
}

interface Note {
  date: string;
  note: string;
}

const SNS_NOTE_COLOR = "#1D9E75";

const TARGET_KPIS: { key: string; percent?: boolean }[] = [
  { key: "View" },
  { key: "Frequency" },
  { key: "Interaction" },
  { key: "Follower" },
  { key: "Sessions" },
  { key: "ER", percent: true },
];

const DEFAULT_TARGETS: Record<string, number> = {
  View: 100000,
  Frequency: 30,
  Interaction: 3000,
  Follower: 50000,
  Sessions: 10000,
  ER: 3,
};

function markerLabel(note: string): string {
  return note.length > 16 ? `${note.slice(0, 16)}…` : note;
}

function NoteLabel(props: any) {
  const { viewBox, value, row } = props;
  if (!viewBox) return null;
  return (
    <text x={viewBox.x} y={viewBox.y + 6 + (row ?? 0) * 11} textAnchor="middle" fontSize={9} fill={SNS_NOTE_COLOR}>
      {value}
    </text>
  );
}

function achClass(pct: number): string {
  if (pct >= 100) return "bg-emerald-50 text-emerald-700";
  if (pct >= 70) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function targetAchievement(actual: number, target: number, percent?: boolean): number {
  const a = percent ? actual * 100 : actual;
  return target > 0 ? (a / target) * 100 : 0;
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

function dayMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function fmtTick(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-white" style={{ border: "0.5px solid #e2e8f0", padding: "11px 13px" }}>
      {label && <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400">{label}</p>}
      {children}
    </div>
  );
}

function Wow({ value, previous }: { value: number | null; previous: number | null }) {
  if (value === null || previous === null || previous === 0) return <p className="mt-0.5 text-[10px] text-slate-300">vs prev —</p>;
  const pct = (value - previous) / previous;
  const up = pct >= 0;
  return (
    <p className={["mt-0.5 text-[10px]", up ? "text-emerald-600" : "text-red-500"].join(" ")}>
      {up ? "▲" : "▼"} {Math.abs(pct * 100).toFixed(0)}%
    </p>
  );
}

export default function SnsView({ posts, followers, ga4 }: { posts: SnsPostRow[]; followers: Record<SnsPlatform, number>; ga4: Ga4Day[] }) {
  const { start, end, previousStart, previousEnd } = useDateRange();
  const [tab, setTab] = useState<PlatformTab>("All");
  const [cell, setCell] = useState<Cell | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDate, setNoteDate] = useState(start);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [targets, setTargets] = useState<Record<string, number>>(DEFAULT_TARGETS);

  const monthKey = `${start.slice(0, 7)}-01`;

  const loadNotes = useCallback(() => {
    if (!supabase) return;
    supabase
      .from("optimization_log")
      .select("date, note")
      .eq("page", "sns")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn("[sns] optimization_log unavailable", error.message);
          return;
        }
        setNotes((data ?? []).map((r: any) => ({ date: String(r.date).slice(0, 10), note: r.note ?? "" })));
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
    const { error } = await supabase.from("optimization_log").insert({ date: noteDate, page: "sns", note: noteText.trim() });
    if (error) {
      setNoteError(error.message);
      return;
    }
    setNoteText("");
    loadNotes();
  };

  const loadTargets = useCallback(() => {
    if (!supabase) return;
    supabase
      .from("monthly_targets")
      .select("kpi, target")
      .eq("month", monthKey)
      .then(({ data, error }) => {
        if (error) {
          console.warn("[sns] monthly_targets unavailable", error.message);
          return;
        }
        const next = { ...DEFAULT_TARGETS };
        for (const r of data ?? []) if (r.kpi in next) next[r.kpi] = Number(r.target);
        setTargets(next);
      });
  }, [monthKey]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const saveTarget = useCallback(
    async (kpi: string, value: number) => {
      if (!supabase) return;
      const { data } = await supabase.from("monthly_targets").select("id").eq("month", monthKey).eq("kpi", kpi).limit(1);
      if (data && data.length) await supabase.from("monthly_targets").update({ target: value }).eq("id", data[0].id);
      else await supabase.from("monthly_targets").insert({ month: monthKey, kpi, target: value });
    },
    [monthKey]
  );

  const ranged = useMemo(() => inRange(posts, start, end), [posts, start, end]);
  const prevRanged = useMemo(() => inRange(posts, previousStart, previousEnd), [posts, previousStart, previousEnd]);
  const ga4Days = useMemo(() => inRange(ga4, start, end), [ga4, start, end]);

  const tabs: PlatformTab[] = ["All", ...snsPlatforms(posts)];
  const prevTotals = prevRanged.length ? snsTotals(prevRanged, tab) : null;
  const metrics = snsMetrics(ranged, tab);
  const heat = pillarHeatmap(ranged);

  const totals = snsTotals(ranged, "All");
  const orgSessions = ga4Days.filter((d) => ORGANIC.has(d.source)).reduce((a, d) => a + d.sessions, 0);
  const actuals: Record<string, number> = {
    View: totals.views,
    Frequency: ranged.length,
    Interaction: totals.interactions,
    Follower: followers.Facebook + followers.Instagram + followers.Threads,
    Sessions: orgSessions,
    ER: totals.er,
  };

  const followerTotal = tab === "All" ? followers.Facebook + followers.Instagram + followers.Threads : followers[tab] ?? 0;
  const cards: { label: string; value: number | null; unit: Unit; prev: number | null }[] = [
    ...metrics.map((m) => ({ label: m.label, value: m.value as number | null, unit: m.unit, prev: prevTotals ? prevTotals[m.key] : null })),
    { label: "Followers", value: followerTotal, unit: "number", prev: null },
  ];

  const tabPosts = useMemo(() => ranged.filter((p) => tab === "All" || p.platform === tab), [ranged, tab]);

  const dates = useMemo(() => eachDay(start, end), [start, end]);
  const startMs = dayMs(start);
  const endMs = dayMs(end);
  const chartData = useMemo(() => {
    const vm = new Map<string, number>();
    for (const p of tabPosts) vm.set(p.date, (vm.get(p.date) ?? 0) + p.views);
    const sm = new Map<string, number>();
    const tm = new Map<string, number>();
    for (const d of ga4Days) {
      if (ORGANIC.has(d.source)) tm.set(d.date, (tm.get(d.date) ?? 0) + d.sessions);
      const ok = tab === "All" ? ORGANIC.has(d.source) : d.source === PLATFORM_SOURCE[tab];
      if (ok) sm.set(d.date, (sm.get(d.date) ?? 0) + d.sessions);
    }
    return dates.map((d) => ({ ts: dayMs(d), views: vm.get(d) ?? 0, sessions: sm.get(d) ?? 0, totalSessions: tm.get(d) ?? 0 })).filter((p) => p.ts >= startMs && p.ts <= endMs);
  }, [tabPosts, ga4Days, tab, dates, startMs, endMs]);

  const topContent = useMemo(
    () =>
      tabPosts
        .filter((p) => !cell || (p.pillar === cell.pillar && p.platform === cell.platform))
        .sort((a, b) => b.views - a.views)
        .slice(0, 6),
    [tabPosts, cell]
  );

  const rangeNotes = notes.filter((n) => n.date >= start && n.date <= end);
  const markerRowSeen = new Map<string, number>();
  const markers = rangeNotes.map((n) => {
    const row = markerRowSeen.get(n.date) ?? 0;
    markerRowSeen.set(n.date, row + 1);
    return { date: n.date, note: n.note, row: row % 3 };
  });

  if (ranged.length === 0) {
    return <EmptyState title="No posts in range" message="No SNS posts for the selected dates." />;
  }

  const toggleCell = (next: Cell) =>
    setCell((prev) => (prev && prev.pillar === next.pillar && prev.platform === next.platform ? null : next));

  return (
    <div className="flex items-start gap-4">
      <div className="w-3/5 space-y-4">
        <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "rounded-md px-3 py-1 text-xs font-normal transition-colors",
                tab === t ? "border-slate-200 bg-white text-slate-900" : "border-transparent text-slate-500",
              ].join(" ")}
              style={{ borderWidth: 0.5, borderStyle: "solid" }}
            >
              {t}
            </button>
          ))}
        </div>

        <Section label="Content overview">
          <div className="grid grid-cols-3 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-md bg-slate-50" style={{ padding: "9px 11px" }}>
                <p className="text-[11px] text-slate-400">{c.label}</p>
                <p className="mt-0.5 text-[18px] font-medium leading-tight text-slate-900">{c.value === null ? "—" : formatValue(c.value, c.unit)}</p>
                <Wow value={c.value} previous={c.prev} />
              </div>
            ))}
          </div>
        </Section>

        <Section label="Daily views & sessions">
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="ts" type="number" scale="time" domain={[startMs, endMs]} tickFormatter={fmtTick} tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip labelFormatter={(d) => fmtTick(Number(d))} formatter={(v: number) => formatNumber(v)} contentStyle={{ borderRadius: 8, border: "0.5px solid #e2e8f0", fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="views" name="Views" fill="#7c3aed" radius={[3, 3, 0, 0]} barSize={12} />
                <Line yAxisId="right" type="monotone" dataKey="sessions" name={tab === "All" ? "Sessions" : `${tab} sessions`} stroke="#14b8a6" strokeWidth={2} dot={false} />
                {tab !== "All" && (
                  <Line yAxisId="right" type="monotone" dataKey="totalSessions" name="Total sessions" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                )}
                {markers.map((m, i) => (
                  <ReferenceLine
                    key={`${m.date}-${i}`}
                    yAxisId="left"
                    x={dayMs(m.date)}
                    stroke={SNS_NOTE_COLOR}
                    strokeDasharray="4 4"
                    label={<NoteLabel value={markerLabel(m.note)} row={m.row} />}
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
              <div key={`${n.date}-${i}`} className="rounded-r-md bg-slate-50 px-3 py-1.5" style={{ borderLeftWidth: 2, borderLeftStyle: "solid", borderLeftColor: SNS_NOTE_COLOR }}>
                <p className="text-[10px] text-slate-400">{fmtTick(dayMs(n.date))}</p>
                <p className="text-xs text-slate-700">{n.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="rounded-md px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
              style={{ border: "0.5px solid #e2e8f0" }}
            />
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an optimization note"
              className="min-w-[140px] flex-1 rounded-md px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
              style={{ border: "0.5px solid #e2e8f0" }}
            />
            <button onClick={addNote} className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">
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
              <tr className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400">
                <th className="pb-2 font-medium">KPI</th>
                <th className="pb-2 text-right font-medium">Target</th>
                <th className="pb-2 text-right font-medium">Actual</th>
                <th className="pb-2 text-right font-medium">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {TARGET_KPIS.map((kpi, i) => {
                const target = targets[kpi.key] ?? 0;
                const actual = actuals[kpi.key] ?? 0;
                const pct = targetAchievement(actual, target, kpi.percent);
                return (
                  <tr key={kpi.key} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                    <td className="py-1.5 text-slate-700">{kpi.key}</td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        value={target}
                        onChange={(e) => setTargets({ ...targets, [kpi.key]: Number(e.target.value) })}
                        onBlur={(e) => saveTarget(kpi.key, Number(e.target.value))}
                        className="w-20 rounded-md px-1.5 py-1 text-right text-xs text-slate-700 outline-none focus:border-purple-500"
                        style={{ border: "0.5px solid #e2e8f0" }}
                      />
                    </td>
                    <td className="py-1.5 text-right text-slate-600">{kpi.percent ? formatPercent(actual) : formatNumber(actual)}</td>
                    <td className="py-1.5 text-right">
                      <span className={["inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", achClass(pct)].join(" ")}>{pct.toFixed(0)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section label="Pillar performance">
          <p className="mb-2.5 text-[10px] text-slate-400">Views by pillar × platform — click a cell to filter posts</p>
          <div className="grid items-center gap-1 text-[10px]" style={{ gridTemplateColumns: `auto repeat(${heat.platforms.length}, 1fr)` }}>
            <div />
            {heat.platforms.map((p) => (
              <div key={p} className="pb-1 text-center font-medium text-slate-400">{p.slice(0, 2)}</div>
            ))}
            {heat.pillars.map((pillar) => (
              <div key={pillar} className="contents">
                <div className="pr-2 font-medium text-slate-600">{pillar}</div>
                {heat.platforms.map((pf) => {
                  const v = heat.value(pillar, pf);
                  const opacity = v / heat.max;
                  const selected = cell?.pillar === pillar && cell?.platform === pf;
                  return (
                    <button
                      key={pf}
                      onClick={() => toggleCell({ pillar, platform: pf })}
                      title={`${pillar} · ${pf}: ${formatNumber(v)} views`}
                      className={["flex h-9 items-center justify-center rounded text-[10px] font-semibold transition-all", opacity > 0.55 ? "text-white" : "text-purple-900", selected ? "ring-2 ring-purple-600 ring-offset-1" : ""].join(" ")}
                      style={{ backgroundColor: `rgba(124, 58, 237, ${opacity.toFixed(2)})` }}
                    >
                      {Math.round(v / 1000)}k
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Section>

        <Section label="Top content">
          {cell && (
            <button onClick={() => setCell(null)} className="mb-2 text-[11px] font-medium text-purple-600 hover:text-purple-700">
              Clear {cell.pillar} · {cell.platform} ✕
            </button>
          )}
          <div className="space-y-2">
            {topContent.length === 0 && <p className="text-xs text-slate-400">No content for this filter.</p>}
            {topContent.map((p) => (
              <a key={p.url} href={p.url} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 hover:bg-slate-100">
                <span className="inline-flex h-5 w-7 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white" style={{ backgroundColor: PLATFORM_COLORS[p.platform] }}>
                  {p.platform.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">{p.pillar}</p>
                  <p className="text-[10px] text-slate-400">{p.date}</p>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-slate-700">{formatNumber(p.views)}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
              </a>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
