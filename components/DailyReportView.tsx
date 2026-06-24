"use client";

import { Ga4Day, MetaDay } from "@/lib/realData";

/* ── tokens ─────────────────────────────────────────────────────────── */

const COLOR: Record<string, string> = {
  April: "#2563EB",
  "Talent-Pool": "#7C3AED",
  "Job-page": "#0891B2",
  Mentoring: "#DB2777",
  "K-Tuvi": "#059669",
  "Launch-App": "#F59E0B",
  "May-Hackathon": "#DC2626",
  CVReg: "#64748B",
};

const LEADDEF: Record<string, string> = {
  April: "Submissions",
  "Talent-Pool": "Leads",
  "Job-page": "Applicants",
  Mentoring: "Form submits",
  "K-Tuvi": "Leads",
  "Launch-App": "App installs",
  "May-Hackathon": "Registrations",
  CVReg: "CV registrations",
};

const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ── helpers ────────────────────────────────────────────────────────── */

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const leadDefOf = (p: string) => LEADDEF[p] ?? "Leads";
const colorOf = (p: string) => COLOR[p] ?? "#64748B";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

interface Agg {
  spend: number;
  imp: number;
  clk: number;
  lead: number;
}
const newAgg = (): Agg => ({ spend: 0, imp: 0, clk: 0, lead: 0 });
const ctrOf = (a: Agg) => (a.imp > 0 ? (a.clk / a.imp) * 100 : 0);

// day-over-day percentage change; null when no comparable previous value
function dod(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

/* ── component ──────────────────────────────────────────────────────── */

export default function DailyReportView({ meta, ga4 }: { meta: MetaDay[]; ga4: Ga4Day[] }) {
  const dates = [...new Set(meta.map((r) => r.date))].sort();

  if (dates.length === 0) {
    return (
      <div style={fullBleed}>
        <FontLink />
        <div style={{ maxWidth: 1480, margin: "0 auto" }}>
          <div style={card}>No Meta data available.</div>
        </div>
      </div>
    );
  }

  // Latest data day = "today" (its data is still incoming); report on yesterday,
  // compare DoD against the day before that.
  const today = dates[dates.length - 1];
  const reportDay = addDays(today, -1);
  const prevDay = addDays(reportDay, -1);
  const monthStart = `${reportDay.slice(0, 7)}-01`;

  const dayAgg = (prod: string | null, day: string): Agg => {
    const a = newAgg();
    for (const r of meta) {
      if (r.date === day && (prod === null || r.product === prod)) {
        a.spend += r.spend; a.imp += r.impressions; a.clk += r.clicks; a.lead += r.leads;
      }
    }
    return a;
  };
  // month-to-date spend (month start → given day)
  const mtdSpend = (prod: string | null, day: string): number => {
    let s = 0;
    for (const r of meta) {
      if ((prod === null || r.product === prod) && r.date >= monthStart && r.date <= day) s += r.spend;
    }
    return s;
  };
  const sessDay = (day: string): number => {
    let s = 0;
    for (const r of ga4) if (r.channel === "paid" && r.date === day) s += r.sessions;
    return s;
  };

  // Top audience / creative are ranked over month-to-date (month start → report day),
  // and compared against the immediately preceding window of equal length (period-over-period).
  const dayCount = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
  const mtdLen = dayCount(monthStart, reportDay);
  const priorEnd = addDays(monthStart, -1);
  const priorStart = addDays(monthStart, -mtdLen);

  const aggRange = (prod: string, key: (r: MetaDay) => string, start: string, end: string) => {
    const m = new Map<string, Agg>();
    for (const r of meta) {
      if (r.product !== prod || r.date < start || r.date > end) continue;
      const k = key(r) || "(none)";
      let a = m.get(k);
      if (!a) m.set(k, (a = newAgg()));
      a.spend += r.spend; a.imp += r.impressions; a.clk += r.clicks; a.lead += r.leads;
    }
    return m;
  };
  const topPick = (prod: string, key: (r: MetaDay) => string) => {
    const rows = [...aggRange(prod, key, monthStart, reportDay).entries()].map(([name, a]) => ({ name, lead: a.lead, ctr: ctrOf(a) }));
    rows.sort((x, y) => y.lead - x.lead || y.ctr - x.ctr);
    const top = rows[0];
    if (!top) return null;
    const prior = aggRange(prod, key, priorStart, priorEnd).get(top.name);
    return { name: top.name, lead: top.lead, ctr: top.ctr, dodPct: dod(top.lead, prior ? prior.lead : 0) };
  };

  const products = [...new Set(meta.filter((r) => r.date >= monthStart && r.date <= reportDay).map((r) => r.product).filter(Boolean))];
  products.sort((a, b) => mtdSpend(b, reportDay) - mtdSpend(a, reportDay));

  // overview aggregates
  const ovD = dayAgg(null, reportDay);
  const ovP = dayAgg(null, prevDay);

  const overviewKpis = [
    { label: "Ad Spend", value: fmt(mtdSpend(null, reportDay)), unit: "₩", sub: "Month-to-date", dodPct: dod(ovD.spend, ovP.spend), tone: "neutral" as const, ...ACCENT.spend },
    { label: "Impressions", value: fmt(ovD.imp), unit: "", sub: "Report day", dodPct: dod(ovD.imp, ovP.imp), tone: "up" as const, ...ACCENT.imp },
    { label: "CTR", value: ctrOf(ovD).toFixed(2), unit: "%", sub: "Report day", dodPct: dod(ctrOf(ovD), ctrOf(ovP)), tone: "up" as const, ...ACCENT.ctr },
    { label: "Sessions", value: fmt(sessDay(reportDay)), unit: "", sub: "Paid sessions (GA4)", dodPct: dod(sessDay(reportDay), sessDay(prevDay)), tone: "up" as const, ...ACCENT.sess },
  ];

  return (
    <div style={fullBleed}>
      <FontLink />
      <div style={{ maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* HEADER */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94A3B8", marginBottom: 5 }}>
            Daily Report · Meta Ads
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em" }}>FYI Daily Performance</h1>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>
            All Meta campaigns · {fmtDate(reportDay)} · DoD vs {fmtDate(prevDay)} · Ad Spend is month-to-date
          </p>
        </div>

        {/* OVERVIEW */}
        <div style={card}>
          <h2 style={{ ...h2, marginBottom: 14 }}>Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 }}>
            {overviewKpis.map((k) => <Kpi key={k.label} {...k} />)}
          </div>
        </div>

        {/* PER-CAMPAIGN */}
        {products.map((p) => {
          const d = dayAgg(p, reportDay);
          const pr = dayAgg(p, prevDay);
          const cplD = d.lead > 0 ? d.spend / d.lead : 0;
          const cplP = pr.lead > 0 ? pr.spend / pr.lead : 0;
          const leadLabel = leadDefOf(p);
          const topAud = topPick(p, (r) => r.audience);
          const topCre = topPick(p, (r) => r.adName);
          const kpis = [
            { label: "Ad Spend", value: fmt(mtdSpend(p, reportDay)), unit: "₩", sub: "Month-to-date", dodPct: dod(d.spend, pr.spend), tone: "neutral" as const, ...ACCENT.spend },
            { label: "Impressions", value: fmt(d.imp), unit: "", sub: "Report day", dodPct: dod(d.imp, pr.imp), tone: "up" as const, ...ACCENT.imp },
            { label: "Clicks", value: fmt(d.clk), unit: "", sub: "Report day", dodPct: dod(d.clk, pr.clk), tone: "up" as const, ...ACCENT.clk },
            { label: "CTR", value: ctrOf(d).toFixed(2), unit: "%", sub: "Report day", dodPct: dod(ctrOf(d), ctrOf(pr)), tone: "up" as const, ...ACCENT.ctr },
            { label: "Leads", value: fmt(d.lead), unit: "", sub: leadLabel, dodPct: dod(d.lead, pr.lead), tone: "up" as const, ...ACCENT.lead },
            { label: "CP Lead", value: cplD > 0 ? fmt(cplD) : "—", unit: "₩", sub: "Cost per lead", dodPct: dod(cplD, cplP), tone: "down" as const, ...ACCENT.cpl },
          ];
          return (
            <div key={p} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: colorOf(p) }} />
                <h2 style={h2}>{p}</h2>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>lead = {leadLabel.toLowerCase()}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 11, marginBottom: 14 }}>
                {kpis.map((k) => <Kpi key={k.label} compact {...k} />)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <TopCard title="Top audience" pick={topAud} color={colorOf(p)} />
                <TopCard title="Top creative" pick={topCre} color={colorOf(p)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── KPI card ───────────────────────────────────────────────────────── */

interface KpiProps {
  label: string;
  value: string;
  unit: string;
  sub: string;
  dodPct: number | null;
  tone: "up" | "down" | "neutral"; // which direction is "good"
  color: string;
  iconBg: string;
  shape: string;
  compact?: boolean;
}

function Kpi({ label, value, unit, sub, dodPct, tone, color, iconBg, shape, compact }: KpiProps) {
  const flat = dodPct === null || Math.abs(dodPct) < 0.5;
  const up = dodPct !== null && dodPct > 0;
  let badgeColor = "#94A3B8";
  if (!flat && tone !== "neutral") badgeColor = (tone === "up" ? up : !up) ? "#059669" : "#DC2626";
  const arrow = flat ? "→" : up ? "▲" : "▼";
  const badge = dodPct === null ? "n/a" : flat ? "0%" : `${arrow} ${Math.abs(dodPct).toFixed(0)}%`;

  return (
    <div style={{ background: "#fff", borderRadius: 13, padding: compact ? "13px 14px" : "17px 19px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 8 : 11 }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: shape, background: color }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>{label}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: compact ? 21 : 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em" }}>{value}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>{unit}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 5 }}>
        <span style={{ fontSize: 10, color: "#94A3B8" }}>{sub}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor }}>{badge}</span>
      </div>
    </div>
  );
}

function TopCard({ title, pick, color }: { title: string; pick: { name: string; lead: number; ctr: number; dodPct: number | null } | null; color: string }) {
  const flat = pick?.dodPct === null || (pick && Math.abs(pick.dodPct!) < 0.5);
  const up = pick?.dodPct != null && pick.dodPct > 0;
  const badgeColor = pick?.dodPct == null ? "#94A3B8" : flat ? "#94A3B8" : up ? "#059669" : "#DC2626";
  const badge = pick?.dodPct == null ? "n/a" : flat ? "0%" : `${up ? "▲" : "▼"} ${Math.abs(pick.dodPct!).toFixed(0)}%`;
  return (
    <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8" }}>{title}</span>
        <span style={{ fontSize: 9, color: "#CBD5E1" }}>MTD · vs prior period</span>
      </div>
      {pick ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 5 }}>{pick.name}</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#64748B" }}>Leads <b style={{ color: "#0F172A" }}>{fmt(pick.lead)}</b></span>
            <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor }}>{badge}</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>CTR <b style={{ color: "#0F172A" }}>{pick.ctr.toFixed(2)}%</b></span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: "#CBD5E1" }}>No data this month</div>
      )}
    </div>
  );
}

/* ── accents & styles ───────────────────────────────────────────────── */

const ACCENT = {
  spend: { color: "#2563EB", iconBg: "#DBEAFE", shape: "3px" },
  imp: { color: "#0891B2", iconBg: "#CFFAFE", shape: "3px" },
  clk: { color: "#7C3AED", iconBg: "#EDE9FE", shape: "50%" },
  ctr: { color: "#D97706", iconBg: "#FEF3C7", shape: "50%" },
  sess: { color: "#DB2777", iconBg: "#FCE7F3", shape: "50%" },
  lead: { color: "#059669", iconBg: "#DCFCE7", shape: "50%" },
  cpl: { color: "#475569", iconBg: "#F1F5F9", shape: "3px" },
};

const fullBleed: React.CSSProperties = {
  margin: "-24px -32px",
  padding: "26px 32px 60px",
  background: "#EEECEA",
  minHeight: "calc(100% + 48px)",
  fontFamily: FONT,
  color: "#0F172A",
};

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 13,
  padding: "22px 24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  border: "1px solid rgba(0,0,0,0.04)",
};

const h2: React.CSSProperties = { fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" };

function FontLink() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
  );
}
