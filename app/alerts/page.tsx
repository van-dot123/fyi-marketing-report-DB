import { getGa4Days, getMetaDays, getSnsPosts } from "@/lib/realData";
import { funnelWeekly, isoWeekRange, metaWeekly, snsWeekly } from "@/lib/aggregate";
import { weekLabel } from "@/lib/normalize";
import { runWithInternalFilter, supabase } from "@/lib/supabase";
import { Unit } from "@/lib/format";
import AlertsList, { Alert } from "@/components/AlertsList";

const ORGANIC = new Set(["facebook", "instagram", "threads"]);

function weekNum(w: string): number {
  return parseInt(w.slice(1), 10) || 0;
}

function md(iso: string): string {
  return iso ? iso.slice(5) : "";
}

function dayStartISO(iso: string): string {
  return new Date(`${iso}T00:00:00`).toISOString();
}

function dayEndISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

interface SeriesDef {
  source: string;
  metric: string;
  unit: Unit;
  href: string;
  points: { week: string; value: number }[];
}

// One alert per consecutive-week pair whose change exceeds ±15%.
function buildAlerts(series: SeriesDef[], ranges: Map<string, { start: string; end: string }>): Alert[] {
  const out: Alert[] = [];
  for (const s of series) {
    const pts = [...s.points].sort((a, b) => weekNum(a.week) - weekNum(b.week));
    for (let i = 1; i < pts.length; i++) {
      const previous = pts[i - 1].value;
      const current = pts[i].value;
      const pct = previous ? (current - previous) / previous : 0;
      if (Math.abs(pct) <= 0.15) continue;
      const wk = pts[i].week;
      const r = ranges.get(wk);
      out.push({
        source: s.source,
        metric: s.metric,
        weekRange: r ? `${md(r.start)} ~ ${md(r.end)}` : wk,
        weekNum: weekNum(wk),
        current,
        previous,
        pct,
        unit: s.unit,
        href: s.href,
      });
    }
  }
  // Most recent week first, then largest movement.
  return out.sort((a, b) => b.weekNum - a.weekNum || Math.abs(b.pct) - Math.abs(a.pct));
}

// All created_at dates ("YYYY-MM-DD") for a Supabase table in range, internal records excluded.
async function fetchDates(table: string, lo: string, hi: string): Promise<string[]> {
  if (!supabase) return [];
  const out: string[] = [];
  const size = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await runWithInternalFilter(table, (apply) =>
      apply(supabase!.from(table).select("created_at").gte("created_at", lo).lte("created_at", hi))
        .order("created_at", { ascending: true })
        .range(from, from + size - 1)
    );
    if (error) {
      console.warn(`[alerts] ${table} fetch error: ${error.message ?? error}`);
      break;
    }
    const rows = data ?? [];
    for (const r of rows) out.push(String((r as any).created_at).slice(0, 10));
    if (rows.length < size) break;
    from += size;
  }
  return out;
}

function weeklyFromDates(dates: string[]): { week: string; value: number }[] {
  const m = new Map<string, number>();
  for (const d of dates) m.set(weekLabel(d), (m.get(weekLabel(d)) ?? 0) + 1);
  return [...m.entries()].map(([week, value]) => ({ week, value }));
}

export default async function AlertsPage() {
  const [meta, ga4, posts] = await Promise.all([getMetaDays(), getGa4Days(), getSnsPosts()]);

  const mw = metaWeekly(meta);
  const fw = funnelWeekly(meta, ga4);
  const sw = snsWeekly(posts, "All");

  // Date span across all sheet data → bounds the Supabase queries.
  const sheetDates = [...meta, ...ga4, ...posts].map((r) => r.date).filter(Boolean).sort();
  const lo = dayStartISO(sheetDates[0] ?? "2000-01-01");
  const hi = dayEndISO(sheetDates[sheetDates.length - 1] ?? "2100-01-01");

  const [subDates, jobDates] = await Promise.all([
    fetchDates("submissions", lo, hi),
    fetchDates("job_applications", lo, hi),
  ]);

  // Resolve each ISO-week label to a Mon→Sun calendar range from the earliest
  // observed date for that week (across every dated source).
  const rep = new Map<string, string>();
  for (const r of [...meta, ...ga4, ...posts]) {
    const cur = rep.get(r.week);
    if (r.date && (!cur || r.date < cur)) rep.set(r.week, r.date);
  }
  for (const d of [...subDates, ...jobDates]) {
    const wk = weekLabel(d);
    const cur = rep.get(wk);
    if (!cur || d < cur) rep.set(wk, d);
  }
  const ranges = new Map<string, { start: string; end: string }>();
  for (const [wk, d] of rep) {
    const [start, end] = isoWeekRange(d);
    ranges.set(wk, { start, end });
  }

  // Organic SNS sessions (GA4 facebook/instagram/threads) per week.
  const orgSessMap = new Map<string, number>();
  for (const d of ga4) if (ORGANIC.has(d.source)) orgSessMap.set(d.week, (orgSessMap.get(d.week) ?? 0) + d.sessions);
  const orgSess = [...orgSessMap.entries()].map(([week, value]) => ({ week, value }));

  const alerts = buildAlerts(
    [
      // Paid Channel — meta_ad_raw_data
      { source: "Paid Channel", metric: "Ad Spend", unit: "currency", href: "/paid", points: mw.map((w) => ({ week: w.week, value: w.spend })) },
      { source: "Paid Channel", metric: "Leads", unit: "number", href: "/paid", points: mw.map((w) => ({ week: w.week, value: w.leads })) },
      { source: "Paid Channel", metric: "CPL", unit: "currency", href: "/paid", points: mw.map((w) => ({ week: w.week, value: w.cpl })) },
      { source: "Paid Channel", metric: "CTR", unit: "percent", href: "/paid", points: fw.map((w) => ({ week: w.week, value: w.impressions ? w.clicks / w.impressions : 0 })) },
      // Organic SNS — fb/ins/threads sheets + GA4 organic
      { source: "Organic SNS", metric: "Views", unit: "number", href: "/sns", points: sw.map((w) => ({ week: w.week, value: w.views })) },
      { source: "Organic SNS", metric: "Interactions", unit: "number", href: "/sns", points: sw.map((w) => ({ week: w.week, value: w.interactions })) },
      { source: "Organic SNS", metric: "ER%", unit: "percent", href: "/sns", points: sw.map((w) => ({ week: w.week, value: w.reach ? w.interactions / w.reach : 0 })) },
      { source: "Organic SNS", metric: "Organic Sessions", unit: "number", href: "/sns", points: orgSess },
      // Overview — GA4 all sources + Supabase
      { source: "Overview", metric: "Total Sessions", unit: "number", href: "/", points: fw.map((w) => ({ week: w.week, value: w.sessions })) },
      { source: "Overview", metric: "Submissions", unit: "number", href: "/", points: weeklyFromDates(subDates) },
      { source: "Overview", metric: "Job Apps", unit: "number", href: "/", points: weeklyFromDates(jobDates) },
    ],
    ranges
  );

  return (
    <>
      <p className="mb-6 text-sm text-slate-500">
        {alerts.length} metric{alerts.length === 1 ? "" : "s"} changed more than 15% week-over-week.
      </p>
      <AlertsList alerts={alerts} />
    </>
  );
}
