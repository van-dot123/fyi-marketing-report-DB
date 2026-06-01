"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ExternalLink, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import PostThumbnail from "@/components/PostThumbnail";
import ComparisonBadge from "@/components/ComparisonBadge";
import { useDateRange } from "@/components/DateRangePicker";
import { SnsPlatform, SnsPostRow } from "@/lib/realData";
import {
  PlatformTab,
  inRange,
  pillarHeatmap,
  snsMetrics,
  snsPlatforms,
  snsTotals,
  snsWeekly,
} from "@/lib/aggregate";
import { formatNumber, formatPeriod, formatValue } from "@/lib/format";

interface Cell {
  pillar: string;
  platform: SnsPlatform;
}

export default function SnsView({ posts }: { posts: SnsPostRow[] }) {
  const { start, end, previousStart, previousEnd } = useDateRange();
  const [tab, setTab] = useState<PlatformTab>("All");
  const [activeMetric, setActiveMetric] = useState("views");
  const [cell, setCell] = useState<Cell | null>(null);

  const ranged = inRange(posts, start, end);
  const prevRanged = inRange(posts, previousStart, previousEnd);
  const prevTotals = prevRanged.length ? snsTotals(prevRanged, tab) : null;
  const periodLabel = formatPeriod(previousStart, previousEnd);
  const tabs: PlatformTab[] = ["All", ...snsPlatforms(posts)];
  const metrics = snsMetrics(ranged, tab);
  const weekly = snsWeekly(ranged, tab);
  const heat = pillarHeatmap(ranged);

  const cards = ranged
    .filter((p) => tab === "All" || p.platform === tab)
    .filter((p) => !cell || (p.pillar === cell.pillar && p.platform === cell.platform))
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);

  if (ranged.length === 0) {
    return <EmptyState title="No posts in range" message="No SNS posts for the selected dates." />;
  }

  const toggleCell = (next: Cell) =>
    setCell((prev) => (prev && prev.pillar === next.pillar && prev.platform === next.platform ? null : next));

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">Content overview</span>
        <div className="relative">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as PlatformTab)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-purple-500"
          >
            {tabs.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {metrics.map((m) => {
          const isActive = m.key === activeMetric;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={["min-w-[180px] shrink-0 rounded-xl border-2 bg-white p-4 text-left shadow-sm transition-colors", isActive ? "border-purple-500" : "border-slate-200 hover:border-slate-300"].join(" ")}
            >
              <p className="text-sm font-medium text-slate-500">{m.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatValue(m.value, m.unit)}</p>
              <div className="mt-1">
                <ComparisonBadge value={m.value} previous={prevTotals ? prevTotals[m.key] : null} periodLabel={periodLabel} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">Interactions &amp; Views by Week</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weekly} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => formatNumber(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="interactions" name="Interactions" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={36} isAnimationActive animationDuration={900} />
                <Line yAxisId="right" type="monotone" dataKey="views" name="Views" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive animationDuration={900} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pillar performance</h2>
          <p className="mt-1 text-xs text-slate-400">Views by pillar × platform — click a cell to filter posts</p>
          <div className="mt-4 grid items-center gap-1 text-xs" style={{ gridTemplateColumns: `auto repeat(${heat.platforms.length}, 1fr)` }}>
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
                      className={["flex h-11 items-center justify-center rounded text-[11px] font-semibold transition-all", opacity > 0.55 ? "text-white" : "text-purple-900", selected ? "ring-2 ring-purple-600 ring-offset-1" : ""].join(" ")}
                      style={{ backgroundColor: `rgba(124, 58, 237, ${opacity.toFixed(2)})` }}
                    >
                      {Math.round(v / 1000)}k
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Top content by views</h2>
          {cell && (
            <button onClick={() => setCell(null)} className="text-sm font-medium text-purple-600 hover:text-purple-700">
              Clear {cell.pillar} · {cell.platform} filter ✕
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.url} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <PostThumbnail url={card.url} platform={card.platform} />
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{card.pillar}</span>
                <a href={card.url} className="text-purple-600 hover:text-purple-700" aria-label="Open post"><ExternalLink className="h-4 w-4" /></a>
              </div>
              <p className="mt-2 text-xs text-slate-400">{card.date}</p>
              <div className="mt-3 grid grid-cols-2 gap-y-2 border-t border-slate-50 pt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-slate-400" /> {formatNumber(card.views)}</span>
                <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-slate-400" /> {formatNumber(card.reactions)}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-slate-400" /> {formatNumber(card.comments)}</span>
                <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5 text-slate-400" /> {formatNumber(card.shares)}</span>
              </div>
            </div>
          ))}
          {cards.length === 0 && <p className="text-sm text-slate-400">No content for this filter.</p>}
        </div>
      </section>
    </>
  );
}
