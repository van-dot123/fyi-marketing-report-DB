"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import {
  PILLARS,
  PLATFORM_COLORS,
  Platform,
  PlatformTab,
  SNS_PLATFORMS,
  pillarHeatmap,
  snsMetrics,
  snsPosts,
  viewsByWeek,
} from "@/lib/snsData";
import { formatNumber, formatPercent } from "@/lib/format";

const TABS: PlatformTab[] = ["All", ...SNS_PLATFORMS];

const heatMax = Math.max(
  ...PILLARS.flatMap((pillar) =>
    SNS_PLATFORMS.map((p) => pillarHeatmap[pillar][p])
  )
);

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white"
      style={{ backgroundColor: PLATFORM_COLORS[platform] }}
    >
      {platform[0]}
    </span>
  );
}

export default function SnsPage() {
  const [tab, setTab] = useState<PlatformTab>("All");
  const metrics = snsMetrics(tab);
  const platforms: Platform[] = tab === "All" ? [...SNS_PLATFORMS] : [tab];
  const posts = snsPosts
    .filter((p) => tab === "All" || p.platform === tab)
    .slice(0, 10);

  return (
    <>
      <div className="mb-6 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              t === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Weekly Views by Platform
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsByWeek} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {platforms.map((p, i) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    stackId="views"
                    fill={PLATFORM_COLORS[p]}
                    radius={i === platforms.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    barSize={36}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Pillar × Platform Views
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left font-medium" />
                  {SNS_PLATFORMS.map((p) => (
                    <th key={p} className="px-2 py-1 font-medium">
                      {p[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PILLARS.map((pillar) => (
                  <tr key={pillar}>
                    <td className="pr-2 font-medium text-slate-600">{pillar}</td>
                    {SNS_PLATFORMS.map((p) => {
                      const v = pillarHeatmap[pillar][p];
                      return (
                        <td
                          key={p}
                          className="h-10 w-12 rounded text-center align-middle text-[10px] font-semibold text-purple-900"
                          style={{
                            backgroundColor: `rgba(124, 58, 237, ${(v / heatMax).toFixed(2)})`,
                          }}
                          title={`${pillar} · ${p}: ${formatNumber(v)} views`}
                        >
                          {Math.round(v / 1000)}k
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">
          Top Posts by Views
        </h2>
        <ul className="divide-y divide-slate-50">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center gap-4 py-3">
              <PlatformBadge platform={post.platform} />
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {post.pillar}
              </span>
              <div className="ml-auto flex items-center gap-6 text-sm">
                <span className="text-slate-500">
                  {formatNumber(post.views)} views
                </span>
                <span className="font-medium text-slate-800">
                  {formatPercent(post.er)} ER
                </span>
                <a
                  href={post.url}
                  className="text-purple-600 hover:text-purple-700"
                  aria-label="Open post"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
