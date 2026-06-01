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
  PLATFORM_COLORS,
  PLATFORM_OPTIONS,
  SnsPlatform,
  contentCards,
  dailyViews,
  snsContentMetrics,
  viewsBreakdown,
} from "@/lib/snsContent";
import { formatNumber, formatPct, formatValue } from "@/lib/format";

const LINES = [
  { key: "total", label: "Total views", color: "#7c3aed" },
  { key: "organic", label: "From organic", color: "#2563eb" },
  { key: "ads", label: "From ads", color: "#f59e0b" },
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

function PlatformThumb({
  platform,
}: {
  platform: "Facebook" | "Instagram" | "Threads";
}) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-slate-100">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white"
        style={{ backgroundColor: PLATFORM_COLORS[platform] }}
      >
        {platform[0]}
      </span>
    </div>
  );
}

export default function SnsPage() {
  const [platform, setPlatform] = useState<SnsPlatform>("All");
  const [content, setContent] = useState<ContentType>("All");
  const [activeMetric, setActiveMetric] = useState("views");

  const metrics = snsContentMetrics(platform, content);
  const daily = dailyViews(platform, content);
  const breakdown = viewsBreakdown(platform, content);

  const cards = contentCards
    .filter((c) => platform === "All" || c.platform === platform)
    .filter((c) => content === "All" || c.type === content)
    .sort((a, b) => b.views - a.views);

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

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Views breakdown</h2>
          <p className="mt-1 text-sm text-slate-400">
            {fmtDay(breakdown.start)} – {fmtDay(breakdown.end)} 2026
          </p>

          <div className="mt-5 space-y-5">
            {breakdown.items.map((item) => (
              <div key={item.label}>
                <p className="text-sm text-slate-500">{item.label}</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {formatNumber(item.value)}
                  </span>
                  <WowBadge wow={item.wow} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Top content by views
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <PlatformThumb platform={card.platform} />
              <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-800">
                {card.caption}
              </p>
              <p className="mt-1 text-xs text-slate-400">{fmtDay(card.date)} 2026</p>

              <div className="mt-3 grid grid-cols-2 gap-y-2 border-t border-slate-50 pt-3 text-xs text-slate-500">
                <span>👁 {formatNumber(card.views)}</span>
                <span>❤ {formatNumber(card.interactions)}</span>
                <span>💬 {formatNumber(card.comments)}</span>
                <span>↗ {formatNumber(card.shares)}</span>
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-sm text-slate-400">
              No content for this filter.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
