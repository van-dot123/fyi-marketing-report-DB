"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
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
import { Unit, formatNumber, formatValue } from "@/lib/format";

const PLATFORM_SOURCE: Record<string, string> = { Facebook: "facebook", Instagram: "instagram", Threads: "threads" };
const ORGANIC = new Set(["facebook", "instagram", "threads"]);

interface Cell {
  pillar: string;
  platform: SnsPlatform;
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

export default function SnsView({ posts, ga4 }: { posts: SnsPostRow[]; ga4: Ga4Day[] }) {
  const { start, end, previousStart, previousEnd } = useDateRange();
  const [tab, setTab] = useState<PlatformTab>("All");
  const [cell, setCell] = useState<Cell | null>(null);

  const ranged = useMemo(() => inRange(posts, start, end), [posts, start, end]);
  const prevRanged = useMemo(() => inRange(posts, previousStart, previousEnd), [posts, previousStart, previousEnd]);
  const ga4Days = useMemo(() => inRange(ga4, start, end), [ga4, start, end]);

  const tabs: PlatformTab[] = ["All", ...snsPlatforms(posts)];
  const prevTotals = prevRanged.length ? snsTotals(prevRanged, tab) : null;
  const metrics = snsMetrics(ranged, tab);
  const heat = pillarHeatmap(ranged);

  const cards: { label: string; value: number | null; unit: Unit; prev: number | null }[] = [
    ...metrics.map((m) => ({ label: m.label, value: m.value as number | null, unit: m.unit, prev: prevTotals ? prevTotals[m.key] : null })),
    { label: "Followers", value: null, unit: "number", prev: null },
  ];

  const tabPosts = useMemo(() => ranged.filter((p) => tab === "All" || p.platform === tab), [ranged, tab]);

  const dates = useMemo(() => eachDay(start, end), [start, end]);
  const startMs = dayMs(start);
  const endMs = dayMs(end);
  const chartData = useMemo(() => {
    const vm = new Map<string, number>();
    for (const p of tabPosts) vm.set(p.date, (vm.get(p.date) ?? 0) + p.views);
    const sm = new Map<string, number>();
    for (const d of ga4Days) {
      const ok = tab === "All" ? ORGANIC.has(d.source) : d.source === PLATFORM_SOURCE[tab];
      if (ok) sm.set(d.date, (sm.get(d.date) ?? 0) + d.sessions);
    }
    return dates.map((d) => ({ ts: dayMs(d), views: vm.get(d) ?? 0, sessions: sm.get(d) ?? 0 })).filter((p) => p.ts >= startMs && p.ts <= endMs);
  }, [tabPosts, ga4Days, tab, dates, startMs, endMs]);

  const topContent = useMemo(
    () =>
      tabPosts
        .filter((p) => !cell || (p.pillar === cell.pillar && p.platform === cell.platform))
        .sort((a, b) => b.views - a.views)
        .slice(0, 6),
    [tabPosts, cell]
  );

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
                <Line yAxisId="right" type="monotone" dataKey="sessions" name="Sessions" stroke="#14b8a6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="w-2/5 space-y-4">
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
