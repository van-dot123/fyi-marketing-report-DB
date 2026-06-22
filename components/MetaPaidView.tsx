"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightRow {
  date: string;
  ad_id: string;
  ad_name: string;
  product: string;
  audience: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  leads: number;
  cpl: number | null;
}

type CreativeMap = Record<string, { thumbnail_url?: string; image_url?: string }>;

interface AggAd {
  ad_id: string;
  ad_name: string;
  product: string;
  audience: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number | null;
  ctr: number;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const fmtVND = (n: number) =>
  Math.round(n || 0).toLocaleString("vi-VN") + " ₫";

const fmtNum = (n: number) =>
  Math.round(n || 0).toLocaleString("vi-VN");

const fmtPct = (n: number) =>
  `${((n || 0) * 100).toFixed(2)}%`;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toISO(from), to: toISO(to) };
}

// ─── Aggregation helpers ───────────────────────────────────────────────────────

function aggregateByAd(rows: InsightRow[]): AggAd[] {
  const map = new Map<string, AggAd>();
  for (const r of rows) {
    const prev = map.get(r.ad_id) ?? {
      ad_id: r.ad_id,
      ad_name: r.ad_name,
      product: r.product,
      audience: r.audience,
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      cpl: null,
      ctr: 0,
    };
    prev.spend += r.spend;
    prev.impressions += r.impressions;
    prev.clicks += r.clicks;
    prev.leads += r.leads;
    map.set(r.ad_id, prev);
  }
  return [...map.values()].map((a) => ({
    ...a,
    cpl: a.leads > 0 ? a.spend / a.leads : null,
    ctr: a.impressions > 0 ? a.clicks / a.impressions : 0,
  }));
}

function aggregateByProduct(ads: AggAd[]) {
  const map = new Map<string, { spend: number; leads: number }>();
  for (const a of ads) {
    const prev = map.get(a.product) ?? { spend: 0, leads: 0 };
    prev.spend += a.spend;
    prev.leads += a.leads;
    map.set(a.product, prev);
  }
  return [...map.entries()].map(([product, { spend, leads }]) => ({
    product,
    spend,
    cpl: leads > 0 ? Math.round(spend / leads) : 0,
  }));
}

function aggregateByAudience(ads: AggAd[]) {
  const map = new Map<string, AggAd[]>();
  for (const a of ads) {
    const list = map.get(a.audience) ?? [];
    list.push(a);
    map.set(a.audience, list);
  }
  return [...map.entries()]
    .map(([audience, items]) => {
      const spend = items.reduce((s, i) => s + i.spend, 0);
      const leads = items.reduce((s, i) => s + i.leads, 0);
      return { audience, spend, leads, cpl: leads > 0 ? spend / leads : null, items };
    })
    .sort((a, b) => b.spend - a.spend);
}

// ─── Initials placeholder ─────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const PRODUCT_COLORS: Record<string, string> = {
  April: "#7c3aed",
  "Job-page": "#0ea5e9",
  "K-Tuvi": "#f59e0b",
  Other: "#94a3b8",
};

const PRODUCTS = ["All", "April", "Job-page", "K-Tuvi"] as const;
type ProductFilter = (typeof PRODUCTS)[number];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4" style={{ border: "0.5px solid #e2e8f0" }}>
      <p className="text-[10px] font-normal uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-medium leading-tight text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg bg-white px-5 py-4"
      style={{ border: "0.5px solid #e2e8f0" }}
    >
      {label && (
        <p className="mb-3 text-[10px] font-normal uppercase tracking-[0.06em] text-slate-400">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function ProductTag({ product }: { product: string }) {
  const color = PRODUCT_COLORS[product] ?? "#94a3b8";
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-normal text-white"
      style={{ backgroundColor: color }}
    >
      {product}
    </span>
  );
}

function AudienceTag({ audience }: { audience: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-600">
      {audience}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MetaPaidView() {
  const { from: defaultFrom, to: defaultTo } = defaultRange();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [product, setProduct] = useState<ProductFilter>("All");

  const [rows, setRows] = useState<InsightRow[]>([]);
  const [creatives, setCreatives] = useState<CreativeMap>({});
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [expandedAudiences, setExpandedAudiences] = useState<Set<string>>(new Set());

  // Fetch insights whenever date range changes
  const fetchInsights = useCallback(async (from: string, to: string) => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch(`/api/meta/insights?from=${from}&to=${to}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message ?? `HTTP ${res.status}`);
      }
      const data: InsightRow[] = await res.json();
      setRows(data);
    } catch (err: any) {
      setInsightsError(err.message ?? "Failed to load insights");
      setRows([]);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(dateFrom, dateTo);
  }, [dateFrom, dateTo, fetchInsights]);

  // Fetch creatives once we have unique ad_ids
  useEffect(() => {
    const ids = [...new Set(rows.map((r) => r.ad_id))];
    if (ids.length === 0) {
      setCreatives({});
      return;
    }
    setCreativesLoading(true);
    fetch(`/api/meta/creatives?adIds=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => setCreatives(data))
      .catch(() => setCreatives({}))
      .finally(() => setCreativesLoading(false));
  }, [rows]);

  // ── Filter by product ────────────────────────────────────────────────────────
  const filteredRows = useMemo(
    () => (product === "All" ? rows : rows.filter((r) => r.product === product)),
    [rows, product]
  );

  // ── Aggregate ────────────────────────────────────────────────────────────────
  const aggAds = useMemo(() => aggregateByAd(filteredRows), [filteredRows]);
  const byProduct = useMemo(() => aggregateByProduct(aggregateByAd(rows)), [rows]);
  const byAudience = useMemo(() => aggregateByAudience(aggAds), [aggAds]);

  // ── Summary metrics ──────────────────────────────────────────────────────────
  const totalSpend = aggAds.reduce((s, a) => s + a.spend, 0);
  const totalLeads = aggAds.reduce((s, a) => s + a.leads, 0);
  const totalClicks = aggAds.reduce((s, a) => s + a.clicks, 0);
  const totalImpressions = aggAds.reduce((s, a) => s + a.impressions, 0);
  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // ── Sorted creatives ─────────────────────────────────────────────────────────
  const sortedAds = useMemo(
    () => [...aggAds].sort((a, b) => b.leads - a.leads),
    [aggAds]
  );

  const toggleAudience = (aud: string) => {
    setExpandedAudiences((prev) => {
      const next = new Set(prev);
      next.has(aud) ? next.delete(aud) : next.add(aud);
      return next;
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Section 1 — Date range + Product tabs */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
            style={{ border: "0.5px solid #e2e8f0" }}
          />
          <label className="text-xs text-slate-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-500"
            style={{ border: "0.5px solid #e2e8f0" }}
          />
        </div>

        <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
          {PRODUCTS.map((p) => (
            <button
              key={p}
              onClick={() => setProduct(p)}
              className={[
                "rounded-md px-3 py-1 text-xs font-normal transition-colors",
                product === p
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {p}
            </button>
          ))}
        </div>

        {insightsLoading && (
          <span className="text-xs text-slate-400">Loading…</span>
        )}
      </div>

      {/* Error state */}
      {insightsError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load Meta insights: {insightsError}
        </div>
      )}

      {/* Section 2 — Summary bar */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        <MetricCard
          label="Total Spend"
          value={fmtVND(totalSpend)}
        />
        <MetricCard
          label="Total Leads"
          value={fmtNum(totalLeads)}
        />
        <MetricCard
          label="Avg CPL"
          value={avgCPL > 0 ? fmtVND(avgCPL) : "—"}
        />
        <MetricCard
          label="Avg CTR"
          value={fmtPct(avgCTR)}
        />
        <MetricCard
          label="Total Clicks"
          value={fmtNum(totalClicks)}
        />
        <MetricCard
          label="Avg CPC"
          value={avgCPC > 0 ? fmtVND(avgCPC) : "—"}
        />
      </div>

      {/* Section 3 — Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Section label="Spend by Product">
          {insightsLoading ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={byProduct}
                margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  strokeWidth={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="product"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [fmtVND(v), "Spend"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "0.5px solid #e2e8f0",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="spend"
                  name="Spend"
                  fill="#7c3aed"
                  radius={[4, 4, 0, 0]}
                  barSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section label="CPL by Product">
          {insightsLoading ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={byProduct}
                margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  strokeWidth={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="product"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [fmtVND(v), "CPL"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "0.5px solid #e2e8f0",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="cpl"
                  name="CPL"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  barSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Section 4 — Creative Performance */}
      <Section label="Creative Performance">
        {insightsLoading ? (
          <div className="flex h-32 items-center justify-center text-xs text-slate-400">
            Loading creatives…
          </div>
        ) : sortedAds.length === 0 ? (
          <p className="text-xs text-slate-400">No ad data for this filter.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedAds.map((ad) => {
              const creative = creatives[ad.ad_id];
              const thumb = creative?.thumbnail_url ?? creative?.image_url;
              const cplRatio =
                avgCPL > 0 && ad.cpl !== null ? avgCPL / ad.cpl : null;
              const betterThanAvg = cplRatio !== null && cplRatio > 1;
              const barPct =
                cplRatio !== null
                  ? Math.min(Math.abs(cplRatio - 1) * 100, 100)
                  : 0;

              return (
                <div
                  key={ad.ad_id}
                  className="flex gap-3 rounded-lg p-3"
                  style={{ border: "0.5px solid #e2e8f0" }}
                >
                  {/* Thumbnail */}
                  <div className="shrink-0">
                    {thumb && !creativesLoading ? (
                      <img
                        src={thumb}
                        alt={ad.ad_name}
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-500">
                        {initials(ad.ad_name)}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {ad.ad_name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <ProductTag product={ad.product} />
                      <AudienceTag audience={ad.audience} />
                    </div>

                    {/* Metrics */}
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                      {[
                        { label: "Spend", value: fmtVND(ad.spend) },
                        { label: "Leads", value: fmtNum(ad.leads) },
                        {
                          label: "CPL",
                          value: ad.cpl !== null ? fmtVND(ad.cpl) : "—",
                        },
                        { label: "CTR", value: fmtPct(ad.ctr) },
                      ].map((m) => (
                        <div key={m.label}>
                          <p className="text-[9px] uppercase tracking-wide text-slate-400">
                            {m.label}
                          </p>
                          <p className="text-[11px] font-medium text-slate-700">
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Performance bar vs avg CPL */}
                    {ad.cpl !== null && avgCPL > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">
                            vs avg CPL
                          </span>
                          <span
                            className={[
                              "text-[9px] font-medium",
                              betterThanAvg
                                ? "text-emerald-600"
                                : "text-red-500",
                            ].join(" ")}
                          >
                            {betterThanAvg ? "▼ better" : "▲ worse"}
                          </span>
                        </div>
                        <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={[
                              "h-1 rounded-full transition-all",
                              betterThanAvg ? "bg-emerald-500" : "bg-red-400",
                            ].join(" ")}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Section 5 — Audience × Creative table */}
      <Section label="Audience × Creative">
        {insightsLoading ? (
          <div className="flex h-20 items-center justify-center text-xs text-slate-400">
            Loading…
          </div>
        ) : byAudience.length === 0 ? (
          <p className="text-xs text-slate-400">No data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-normal uppercase tracking-[0.06em] text-slate-400">
                  <th className="pb-2 font-normal">Ad Name</th>
                  <th className="pb-2 text-right font-normal">Spend</th>
                  <th className="pb-2 text-right font-normal">Leads</th>
                  <th className="pb-2 text-right font-normal">CPL</th>
                  <th className="pb-2 text-right font-normal">CTR</th>
                </tr>
              </thead>
              <tbody>
                {byAudience.map((group) => {
                  const expanded = expandedAudiences.has(group.audience);
                  return [
                    // Group header row
                    <tr
                      key={`group-${group.audience}`}
                      className="cursor-pointer bg-slate-50 hover:bg-slate-100"
                      onClick={() => toggleAudience(group.audience)}
                    >
                      <td className="py-2 pr-2 font-medium text-slate-700">
                        <span className="flex items-center gap-1">
                          {expanded ? (
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          )}
                          {group.audience}
                          <span className="ml-1 text-[10px] text-slate-400">
                            ({group.items.length} ads)
                          </span>
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        {fmtVND(group.spend)}
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        {fmtNum(group.leads)}
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        {group.cpl !== null ? fmtVND(group.cpl) : "—"}
                      </td>
                      <td className="py-2 text-right text-slate-400">—</td>
                    </tr>,

                    // Expanded rows
                    ...(expanded
                      ? group.items
                          .sort((a, b) => b.leads - a.leads)
                          .map((ad, i) => (
                            <tr
                              key={`${group.audience}-${ad.ad_id}`}
                              className={i % 2 === 0 ? "" : "bg-slate-50/50"}
                            >
                              <td className="max-w-[260px] truncate py-1.5 pl-6 text-slate-600">
                                {ad.ad_name}
                              </td>
                              <td className="py-1.5 text-right text-slate-500">
                                {fmtVND(ad.spend)}
                              </td>
                              <td className="py-1.5 text-right text-slate-500">
                                {fmtNum(ad.leads)}
                              </td>
                              <td className="py-1.5 text-right text-slate-500">
                                {ad.cpl !== null ? fmtVND(ad.cpl) : "—"}
                              </td>
                              <td className="py-1.5 text-right text-slate-500">
                                {fmtPct(ad.ctr)}
                              </td>
                            </tr>
                          ))
                      : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
