"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronDown } from "lucide-react";
import {
  CONTENT_TYPES,
  ContentType,
  HEATMAP_COLS,
  PILLARS,
  PLATFORM_COLORS,
  PLATFORM_OPTIONS,
  Pillar,
  RealPlatform,
  SnsPlatform,
  contentCards,
  dailyViews,
  heatmapMax,
  pillarHeatmap,
  snsContentMetrics,
  viewsBreakdown,
} from "@/lib/snsContent";
import { formatNumber, formatPct, formatValue } from "@/lib/format";

const LINES = [
  { key: "total", label: "Total views", color: "#7c3aed" },
  { key: "organic", label: "Organic views", color: "#2563eb" },
] as const;

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function WowBadge({ wow }: { wow: number }) {
  const positive = wow >= 0;
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        positive ? "text-emerald-600" : "text-red-600",
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

function PlatformThumb({ platform }: { platform: RealPlatform }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-slate-100">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
        style={{ backgroundColor: PLATFORM_COLORS[platform] }}
      >
        {platform[0]}
      </span>
    </div>
  );
}

interface Cell {
  pillar: Pillar;
  platform: RealPlatform;
}

export default function SnsPage() {
  const [platform, setPlatform] = useState<SnsPlatform>("All");
  const [content, setContent] = useState<ContentType>("All");
  const [activeMetric, setActiveMetric] = useState("views");
  const [cell, setCell] = useState<Cell | null>(null);

  const metrics = snsContentMetrics(platform, content);
  const daily = dailyViews(platform, content);
  const breakdown = viewsBreakdown(platform, content);

  const cards = contentCards
    .filter((c) => platform === "All" || c.platform === platform)
    .filter((c) => content === "All" || c.type === content)
    .filter((c) => !cell || (c.pillar === cell.pillar && c.platform === cell.platform))
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);

  const toggleCell = (next: Cell) =>
    setCell((prev) =>
      prev && prev.pillar === next.pillar && prev.platform === next.platform
        ? null
        : next
    );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          Content overview
        </span>
        <div className="relative">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as SnsPlatform)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-purple-500"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="mb-6 flex gap-6 border-b border-slate-200">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setContent(t)}
            className={[
              "-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              t === content
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {metrics.map((m) => {
          const isActive = m.key === activeMetric;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={[
                "min-w-[180px] shrink-0 rounded-xl border-2 bg-white p-4 text-left shadow-sm transition-colors",
                isActive ? "border-purple-500" : "border-slate-200 hover:border-slate-300",
              ].join(" ")}
            >
              <p className="text-sm font-medium text-slate-500">{m.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatValue(m.value, m.unit)}
              </p>
              <div className="mt-1">
                <WowBadge wow={m.wow} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Views over time
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={fmtDay}
                  interval={4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  labelFormatter={(l) => fmtDay(String(l))}
                  formatter={(v: number) => formatNumber(v)}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {LINES.map((l) => (
                  <Line
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    name={l.label}
                    stroke={l.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Views breakdown</h2>
            <p className="mt-1 text-sm text-slate-400">
              {fmtDay(breakdown.start)} – {fmtDay(breakdown.end)} 2026
            </p>
            <div className="mt-4 space-y-4">
              {breakdown.items.map((item) => (
                <div key={item.label}>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900">
                      {formatNumber(item.value)}
                    </span>
                    <WowBadge wow={item.wow} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Pillar performance
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Views by pillar × platform — click a cell to filter posts
            </p>
            <div
              className="mt-4 grid items-center gap-1 text-xs"
              style={{ gridTemplateColumns: "auto repeat(3, 1fr)" }}
            >
              <div />
              {HEATMAP_COLS.map((c) => (
                <div key={c.platform} className="pb-1 text-center font-medium text-slate-400">
                  {c.label}
                </div>
              ))}

              {PILLARS.map((pillar) => (
                <FragmentRow key={pillar} pillar={pillar} cell={cell} onPick={toggleCell} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Top content by views
          </h2>
          {cell && (
            <button
              onClick={() => setCell(null)}
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              Clear {cell.pillar} · {cell.platform} filter ✕
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <PlatformThumb platform={card.platform} />
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {card.pillar}
                </span>
                <span className="text-xs text-slate-400">{fmtDay(card.date)} 2026</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-800">
                {card.caption}
              </p>
              <div className="mt-3 flex items-center gap-6 border-t border-slate-50 pt-3 text-sm">
                <span className="text-slate-500">
                  👁 {formatNumber(card.views)} views
                </span>
                <span className="font-medium text-slate-800">
                  ❤ {formatNumber(card.interactions)}
                </span>
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-sm text-slate-400">No content for this filter.</p>
          )}
        </div>
      </section>
    </>
  );
}

function FragmentRow({
  pillar,
  cell,
  onPick,
}: {
  pillar: Pillar;
  cell: Cell | null;
  onPick: (c: Cell) => void;
}) {
  return (
    <>
      <div className="pr-2 font-medium text-slate-600">{pillar}</div>
      {HEATMAP_COLS.map((c) => {
        const value = pillarHeatmap[pillar][c.platform];
        const opacity = value / heatmapMax;
        const selected =
          cell?.pillar === pillar && cell?.platform === c.platform;
        return (
          <button
            key={c.platform}
            onClick={() => onPick({ pillar, platform: c.platform })}
            title={`${pillar} · ${c.label}: ${formatNumber(value)} views`}
            className={[
              "flex h-11 items-center justify-center rounded text-[11px] font-semibold transition-all",
              opacity > 0.55 ? "text-white" : "text-purple-900",
              selected ? "ring-2 ring-purple-600 ring-offset-1" : "",
            ].join(" ")}
            style={{ backgroundColor: `rgba(124, 58, 237, ${opacity.toFixed(2)})` }}
          >
            {Math.round(value / 1000)}k
          </button>
        );
      })}
    </>
  );
}
