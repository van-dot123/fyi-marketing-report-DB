"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useDateRange } from "@/components/DateRangePicker";
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

const PALETTE = [
  "#2563EB", "#7C3AED", "#0891B2", "#DB2777", "#059669",
  "#D97706", "#DC2626", "#475569", "#0EA5E9", "#9333EA", "#16A34A",
];

// Map each campaign (Product in v2) to its GA4 UTM campaign values (lowercased).
// Campaigns absent here have no website session tracking (e.g. Launch-App).
const SESSION_UTM: Record<string, string[]> = {
  April: ["fyi_may_lead", "fyi-april"],
  "Job-page": ["job-page", "200-jobs", "hot-job", "fpt-job", "co-hoi"],
  CVReg: ["cv_register"],
};

const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SEED_LOG: LogEntry[] = [
  { id: "s1", date: "2026-05-22", text: "Upload ask-100 campaign on Facebook" },
  { id: "s2", date: "2026-05-19", text: "Upload Job post on Threads" },
  { id: "s3", date: "2026-06-03", text: "Shift budget dir:fresher → dir:exp; kill fpt-ai (CPL too high)" },
  { id: "s4", date: "2026-05-26", text: "Turn off job-offer + 3 rtg ads (low CTR / no lead)" },
  { id: "s5", date: "2026-05-17", text: "Add rtg:engagement adset + 2 new creatives" },
  { id: "s6", date: "2026-04-27", text: "Increase daily budget to 8K" },
  { id: "s7", date: "2026-04-23", text: "Kill MT-traffic → shift budget to MT-lead" },
  { id: "s8", date: "2026-04-21", text: "Turn off dir:fresher static-insight; narrow target audience" },
];

const MEMOS = [
  { date: "23/04", content: "CPL at 334 ₩ (SD ~16%). Freshers > Experienced. static-insight best → leads driven by CURIOSITY, not job-seeking intent." },
  { date: "28/04", content: "CPL drops to 276. Fresher leading. info-asymmetry #1, salary-nego #5. A×C: exp→static-insight; fresher→info-asymmetry." },
  { date: "04/05", content: "CTR decrease detected → time for creative refresh." },
  { date: "26/05", content: "dir:exp/job-global: CPL=799 (watch). dir:fresher/it-remote: CTR 1.77% but CPL 1,006 — observe next 2 days." },
];

const IMG_BGS = [
  "linear-gradient(135deg,#2563EB,#7C3AED)", "linear-gradient(135deg,#0891B2,#2563EB)",
  "linear-gradient(135deg,#DB2777,#7C3AED)", "linear-gradient(135deg,#059669,#0891B2)",
  "linear-gradient(135deg,#D97706,#DC2626)", "linear-gradient(135deg,#7C3AED,#DB2777)",
  "linear-gradient(135deg,#475569,#0F172A)", "linear-gradient(135deg,#0891B2,#059669)",
];

/* ── types ──────────────────────────────────────────────────────────── */

interface LogEntry {
  id: string;
  date: string;
  text: string;
}

type Metric = "leads" | "jobapp" | "clicks" | "ctr" | "sessions" | "installs";

interface Agg {
  spend: number;
  imp: number;
  clk: number;
  lead: number;
}

/* ── helpers ────────────────────────────────────────────────────────── */

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const colorOf = (p: string, i = 0) => COLOR[p] ?? PALETTE[i % PALETTE.length];
const leadDefOf = (p: string) => LEADDEF[p] ?? "Leads";

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function fmtTrig(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function ctrCol(v: number) {
  return v >= 1.2 ? "#059669" : v >= 0.7 ? "#D97706" : "#DC2626";
}

// 5-tier CTR pill colors used by the Audience × Creative table.
function ctrTier(v: number) {
  if (v >= 1.2) return { bg: "#DCFCE7", color: "#166534" };
  if (v >= 1.0) return { bg: "#D1FAE5", color: "#15803D" };
  if (v >= 0.8) return { bg: "#FEF3C7", color: "#854D0E" };
  if (v >= 0.6) return { bg: "#FFEDD5", color: "#9A3412" };
  return { bg: "#FEE2E2", color: "#991B1B" };
}

const AC_GRID = "176px 110px 84px 52px 70px 56px 56px 64px minmax(150px,1fr)";

function cplStyle(c: number, avg: number) {
  if (c <= 0) return { bg: "#F1F5F9", color: "#64748B" };
  if (c < avg * 0.8) return { bg: "#DCFCE7", color: "#166534" };
  if (c < avg * 1.4) return { bg: "#FEF3C7", color: "#92400E" };
  return { bg: "#FEE2E2", color: "#991B1B" };
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return n * p;
}

function newAgg(): Agg {
  return { spend: 0, imp: 0, clk: 0, lead: 0 };
}

function addRow(o: Agg, r: MetaDay) {
  o.spend += r.spend;
  o.imp += r.impressions;
  o.clk += r.clicks;
  o.lead += r.leads;
}

function groupBy(rows: MetaDay[], key: (r: MetaDay) => string) {
  const m = new Map<string, Agg>();
  for (const r of rows) {
    const k = key(r) || "(none)";
    let o = m.get(k);
    if (!o) m.set(k, (o = newAgg()));
    addRow(o, r);
  }
  return [...m.entries()]
    .map(([name, o]) => ({ name, ...o }))
    .filter((x) => x.spend > 0)
    .sort((a, b) => b.spend - a.spend);
}

/* ── component ──────────────────────────────────────────────────────── */

export default function PaidView({ meta, ga4 }: { meta: MetaDay[]; ga4: Ga4Day[] }) {
  const { start, end } = useDateRange();
  const [filter, setFilter] = useState("All");
  const [metrics, setMetrics] = useState<Metric[]>(["leads"]);
  const [log, setLog] = useState<LogEntry[]>(SEED_LOG);

  // Single campaign → default the dashed line to its lead metric (single-select).
  // All → keep current selection (multi-select).
  useEffect(() => {
    if (filter !== "All") setMetrics(["leads"]);
  }, [filter]);

  const toggleMetric = (m: Metric) => {
    if (filter === "All") {
      setMetrics((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
    } else {
      setMetrics([m]);
    }
  };
  const [draftText, setDraftText] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const trendRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [acOpen, setAcOpen] = useState<Record<string, boolean>>({});
  const [acNotes, setAcNotes] = useState<Record<string, string>>({});
  const [acOff, setAcOff] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("fyi_ac_notes_v1");
      if (savedNotes) setAcNotes(JSON.parse(savedNotes));
      const savedOff = localStorage.getItem("fyi_ac_off_v1");
      if (savedOff) setAcOff(JSON.parse(savedOff));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleOff = (key: string) => {
    setAcOff((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("fyi_ac_off_v1", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const setNote = (key: string, val: string) => {
    setAcNotes((prev) => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem("fyi_ac_notes_v1", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleAcGroup = (aud: string, gi: number) =>
    setAcOpen((prev) => ({ ...prev, [aud]: !(prev[aud] ?? gi === 0) }));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fyi_paid_log_v1");
      if (saved) setLog(JSON.parse(saved));
    } catch {
      /* keep seed */
    }
  }, []);

  const saveLog = (next: LogEntry[]) => {
    setLog(next);
    try {
      localStorage.setItem("fyi_paid_log_v1", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const days = useMemo(
    () => meta.filter((r) => r.date >= start && r.date <= end),
    [meta, start, end]
  );

  const sess = useMemo(() => {
    const isAll = filter === "All";
    const utm = SESSION_UTM[filter];
    const available = isAll || utm !== undefined;
    const byDay = new Map<string, number>();
    if (available) {
      for (const r of ga4) {
        if (r.channel !== "paid" || r.date < start || r.date > end) continue;
        if (!isAll && !utm!.includes(String(r.campaign ?? "").toLowerCase())) continue;
        byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.sessions);
      }
    }
    return { byDay, available };
  }, [ga4, start, end, filter]);

  const vm = useMemo(() => buildViewModel(meta, days, filter, metrics, log, sess), [meta, days, filter, metrics, log, sess]);

  if (days.length === 0) {
    return (
      <div style={fullBleed}>
        <FontLink />
        <EmptyState
          title="No paid data in range"
          message="No FYI Meta campaigns found for the selected dates."
        />
      </div>
    );
  }

  const addLog = () => {
    const text = draftText.trim();
    if (!text) return;
    const date = draftDate || vm.curE;
    const next = [...log, { id: `u${Date.now()}`, date, text }];
    saveLog(next);
    setDraftText("");
  };

  return (
    <div style={fullBleed}>
      <FontLink />
      <div style={{ maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* HEADER + FILTER */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94A3B8", marginBottom: 5 }}>
                Paid Channels · Meta Ads
              </div>
              <h1 style={{ fontSize: 25, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em" }}>FYI Paid Media Report</h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 4 }}>
                Lead definition
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "white", border: "1px solid rgba(0,0,0,0.06)", padding: "6px 12px", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: vm.leadDefColor }} />
                <span style={{ fontSize: 12, color: "#64748B" }}>Lead =</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{vm.leadDefLabel}</span>
              </div>
            </div>
          </div>

          {/* filter chips */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginRight: 2 }}>Campaign:</span>
            {vm.chips.map((ch) => (
              <div
                key={ch.key}
                onClick={() => setFilter(ch.active ? "All" : ch.key)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: ch.bg, color: ch.color, border: `1px solid ${ch.border}`, transition: "all .12s" }}
              >
                <div style={{ width: 7, height: 7, borderRadius: 2, background: ch.dot }} />
                {ch.label}
                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>{ch.share}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 13 }}>
          {vm.kpis.map((k) => (
            <div key={k.label} style={{ background: k.cardBg, borderRadius: 13, padding: "17px 19px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${k.cardBorder}`, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 11 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 9, height: 9, borderRadius: k.iconShape, background: k.color }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748B" }}>{k.label}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: k.valColor, letterSpacing: "-0.03em" }}>{k.value}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>{k.unit}</span>
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* DAILY TREND */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={h2}>Daily Trend</h2>
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{vm.trendSub}</p>
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#CBD5E1", fontWeight: 700, marginRight: 3 }}>Cost vs</span>
              {vm.metricBtns.map((m) => (
                <div key={m.key} onClick={() => !m.disabled && toggleMetric(m.key)} title={m.disabled ? "Not tracked for this campaign" : undefined} style={{ cursor: m.disabled ? "not-allowed" : "pointer", padding: "5px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.border}`, opacity: m.disabled ? 0.5 : 1, transition: "all .12s" }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 14, height: 9, background: "#2563EB", borderRadius: 2, opacity: 0.85 }} />
              <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Cost (₩)</span>
            </div>
            {vm.legendLines.map((l) => (
              <div key={l.label} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ width: 16, height: 0, borderTop: `2.5px dashed ${l.color}` }} />
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div style={{ position: "relative" }}>
            <svg
              ref={trendRef}
              viewBox="0 0 940 264"
              style={{ width: "100%", height: "auto", overflow: "visible" }}
              onMouseMove={(e) => {
                const svg = trendRef.current;
                const n = vm.trend.days.length;
                if (!svg || n === 0) return;
                const rect = svg.getBoundingClientRect();
                const vbX = ((e.clientX - rect.left) / rect.width) * 940;
                const idx = n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((vbX - 62) / (878 - 62)) * (n - 1))));
                setHover(idx);
              }}
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              {vm.yLeft.map((g, i) => (
                <g key={`l${i}`}>
                  <line x1="62" y1={g.y} x2="878" y2={g.y} stroke="#F1F5F9" strokeWidth="1" />
                  <text x="55" y={g.y} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9, fill: "#CBD5E1", fontWeight: 700 }}>{g.label}</text>
                </g>
              ))}
              {vm.yRight.map((g, i) => (
                <text key={`r${i}`} x="886" y={g.y} textAnchor="start" dominantBaseline="middle" style={{ fontSize: 9, fill: vm.rightAxisColor, fontWeight: 700, opacity: 0.7 }}>{g.label}</text>
              ))}
              {vm.optMarkers.map((o) => (
                <g key={`m${o.n}`}>
                  <line x1={o.x} y1="40" x2={o.x} y2="208" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3,3" opacity="0.55" />
                  <circle cx={o.x} cy="30" r="8.5" fill="#0F172A" />
                  <text x={o.x} y="30" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fill: "#fff", fontWeight: 800 }}>{o.n}</text>
                </g>
              ))}
              <path d={vm.spendArea} fill="url(#costGrad)" />
              <path d={vm.spendPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {vm.trendLines.map((l, i) => (
                <path key={`tl${i}`} d={l.path} fill="none" stroke={l.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,4" />
              ))}
              {vm.xTicks.map((t, i) => (
                <g key={`x${i}`}>
                  <line x1={t.x} y1="208" x2={t.x} y2="212" stroke="#CBD5E1" strokeWidth="1" />
                  <text x={t.x} y="226" textAnchor="middle" style={{ fontSize: 9.5, fill: "#94A3B8", fontWeight: 600 }}>{t.label}</text>
                </g>
              ))}
              {hover !== null && vm.trend.days[hover] !== undefined && (
                <g>
                  <line x1={vm.trend.xs[hover]} y1="44" x2={vm.trend.xs[hover]} y2="208" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2,3" opacity="0.6" />
                  <circle cx={vm.trend.xs[hover]} cy={208 - (208 - 44) * (vm.trend.costVals[hover] / vm.trend.costMax)} r="4" fill="#2563EB" stroke="#fff" strokeWidth="1.5" />
                  {vm.trend.series.map((s, i) => (
                    <circle key={i} cx={vm.trend.xs[hover]} cy={208 - (208 - 44) * (s.vals[hover] / s.max)} r="4" fill={s.color} stroke="#fff" strokeWidth="1.5" />
                  ))}
                </g>
              )}
            </svg>
            {hover !== null && vm.trend.days[hover] !== undefined && (
              <div
                style={{
                  position: "absolute",
                  left: `${(vm.trend.xs[hover] / 940) * 100}%`,
                  top: 6,
                  transform: (vm.trend.xs[hover] / 940) * 100 < 50 ? "translateX(14px)" : "translateX(calc(-100% - 14px))",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(15,23,42,0.14)",
                  padding: "9px 12px",
                  pointerEvents: "none",
                  zIndex: 5,
                  minWidth: 118,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{fmtDay(vm.trend.days[hover])}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 11 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748B" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#2563EB" }} />Cost</span>
                    <span style={{ fontWeight: 700, color: "#0F172A" }}>{fmt(vm.trend.costVals[hover])} ₩</span>
                  </div>
                  {vm.trend.series.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 11 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748B" }}><span style={{ width: 8, height: 0, borderTop: `2px dashed ${s.color}` }} />{s.label}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.isCtr ? `${s.vals[hover].toFixed(2)}%` : fmt(s.vals[hover])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {vm.metricEmpty && (
              <div style={{ position: "absolute", top: "38%", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", color: "#9A3412", fontSize: 11, fontWeight: 600, padding: "7px 14px", borderRadius: 8 }}>{vm.emptyMsg}</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 14px", marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#CBD5E1", alignSelf: "center" }}>Optimization log ↑</span>
            {vm.optLegend.map((o) => (
              <div key={o.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#0F172A", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{o.n}</span>
                <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700 }}>{o.date}</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{o.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CAMPAIGN TABLE + DONUT */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 312px", gap: 16 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={h2}>{vm.topTitle}</h2>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{vm.topSub}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px 78px 60px 56px", gap: 8, paddingBottom: 9, borderBottom: "1px solid #F1F5F9" }}>
              <span style={th}>{vm.topColHead}</span>
              <span style={th}>Spend (₩)</span>
              <span style={{ ...th, textAlign: "right" }}>Leads</span>
              <span style={{ ...th, textAlign: "center" }}>CP Lead</span>
              <span style={{ ...th, textAlign: "right" }}>Clicks</span>
              <span style={{ ...th, textAlign: "right" }}>CTR</span>
            </div>
            {vm.topRows.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                onClick={() => { if (vm.isAll) setFilter(filter === c.name ? "All" : c.name); }}
                style={{ cursor: c.cursor, display: "grid", gridTemplateColumns: "150px 1fr 64px 78px 60px 56px", gap: 8, padding: "11px 0", borderBottom: "1px solid #F8FAFC", alignItems: "center", background: c.rowBg, borderRadius: 6 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: c.color }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.leadType}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{c.spend}</div>
                  <div style={{ height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.barW}%`, borderRadius: 3, background: c.color }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{c.leads}</div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: c.cplBg, color: c.cplColor, display: "inline-block" }}>{c.cpl}</span>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "#64748B" }}>{c.clicks}</div>
                <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: c.ctrColor }}>{c.ctr}%</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px 78px 60px 56px", gap: 8, padding: "12px 4px 0", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0F172A" }}>Total</span>
              <span style={tot}>{vm.totSpend}</span>
              <span style={{ ...tot, textAlign: "right" }}>{vm.totLeads}</span>
              <span style={{ ...tot, textAlign: "center" }}>{vm.totCpl}</span>
              <span style={{ ...tot, textAlign: "right" }}>{vm.totClicks}</span>
              <span style={{ ...tot, textAlign: "right" }}>{vm.totCtr}%</span>
            </div>
          </div>

          <div style={card}>
            <h2 style={{ ...h2, marginBottom: 10 }}>{vm.mixTitle}</h2>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <svg viewBox="0 0 240 200" width="210" height="175">
                <circle cx="120" cy="100" r="70" fill="none" stroke="#F1F5F9" strokeWidth="26" />
                {vm.donutSegs.map((d, i) => (
                  <circle key={i} cx="120" cy="100" r="70" fill="none" stroke={d.color} strokeWidth="26" strokeDasharray={d.dash} strokeDashoffset={d.offset} transform="rotate(-90 120 100)" />
                ))}
                <text x="120" y="93" textAnchor="middle" style={{ fontSize: 18, fontWeight: 800, fill: "#0F172A", fontFamily: FONT }}>{vm.donutTotal}</text>
                <text x="120" y="110" textAnchor="middle" style={{ fontSize: 10, fill: "#94A3B8", fontFamily: FONT }}>₩ total</text>
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {vm.spendLegend.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
                    <span style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{s.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AUDIENCE / CREATIVE BREAKDOWN */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={h2}>{vm.botTitle}</h2>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{vm.botSub}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 78px 60px 56px", gap: 10, paddingBottom: 9, borderBottom: "1px solid #F1F5F9" }}>
            <span style={th}>{vm.botColHead}</span>
            <span style={{ ...th, textAlign: "right" }}>Leads</span>
            <span style={{ ...th, textAlign: "center" }}>CP Lead</span>
            <span style={{ ...th, textAlign: "right" }}>Clicks</span>
            <span style={{ ...th, textAlign: "right" }}>CTR</span>
          </div>
          {vm.botRows.map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 64px 78px 60px 56px", gap: 10, padding: "11px 0", borderBottom: "1px solid #F8FAFC", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{a.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{a.spend}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{a.share}</span>
                </div>
                <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${a.barW}%`, borderRadius: 3, background: a.color }} />
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{a.leads}</div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: a.cplBg, color: a.cplColor, display: "inline-block" }}>{a.cpl}</span>
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: "#64748B" }}>{a.clicks}</div>
              <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: a.ctrColor }}>{a.ctr}%</div>
            </div>
          ))}
        </div>

        {/* AUDIENCE × CREATIVE */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={h2}>Audience × Creative</h2>
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Per-creative performance by audience · {vm.audCre.groupCount} groups · {fmt(vm.audCre.totalLeads)} total leads</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8" }}>CTR:</span>
              {[{ l: "≥1.2%", v: 1.2 }, { l: "≥1.0%", v: 1.0 }, { l: "≥0.8%", v: 0.8 }, { l: "≥0.6%", v: 0.6 }, { l: "<0.6%", v: 0 }].map((c) => {
                const t = ctrTier(c.v);
                return <span key={c.l} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: t.bg, color: t.color }}>{c.l}</span>;
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: AC_GRID, gap: 8, paddingBottom: 9, borderBottom: "1px solid #F1F5F9" }}>
            <span style={th}>Creative</span>
            <span style={th}>Cost</span>
            <span style={{ ...th, textAlign: "right" }}>Impression</span>
            <span style={{ ...th, textAlign: "right" }}>Lead</span>
            <span style={{ ...th, textAlign: "right" }}>CP Lead</span>
            <span style={{ ...th, textAlign: "right" }}>Click</span>
            <span style={{ ...th, textAlign: "right" }}>CPC</span>
            <span style={{ ...th, textAlign: "center" }}>CTR</span>
            <span style={th}>Note</span>
          </div>

          {vm.audCre.groups.map((g, gi) => {
            const open = acOpen[g.aud] ?? gi === 0;
            const gt = g.total;
            const gtTier = ctrTier(gt.ctrNum);
            return (
              <div key={g.aud}>
                <div onClick={() => toggleAcGroup(g.aud, gi)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F8FAFC", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 3, height: 15, borderRadius: 2, background: g.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{g.aud}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", background: "#F1F5F9", borderRadius: 10, padding: "1px 7px" }}>{g.count}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M6 9l6 6 6-6" /></svg>
                </div>

                {open && (
                  <>
                    {g.creatives.map((c) => {
                      const t = ctrTier(c.ctrNum);
                      const nkey = `${g.aud}::${c.key}`;
                      const off = !!acOff[nkey];
                      return (
                        <div key={c.key} style={{ display: "grid", gridTemplateColumns: AC_GRID, gap: 8, padding: "9px 0", borderBottom: "1px solid #F8FAFC", alignItems: "center", opacity: off ? 0.55 : 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 14 }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#334155", textDecoration: off ? "line-through" : "none" }}>{c.name}</span>
                            <span onClick={() => toggleOff(nkey)} title={off ? "Turned off — click to mark active" : "Mark as turned off"} style={{ cursor: "pointer", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: off ? "#F1F5F9" : "#DCFCE7", color: off ? "#94A3B8" : "#166534", flexShrink: 0, letterSpacing: "0.04em" }}>{off ? "OFF" : "ON"}</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{c.cost}</div>
                            <div style={{ height: 3, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${c.costBarW}%`, background: c.color, borderRadius: 2 }} /></div>
                          </div>
                          <div style={{ textAlign: "right", fontSize: 12, color: "#64748B" }}>{c.imp}</div>
                          <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{c.lead}</div>
                          <div style={{ textAlign: "right", fontSize: 12, color: "#64748B" }}>{c.cpl}</div>
                          <div style={{ textAlign: "right", fontSize: 12, color: "#64748B" }}>{c.click}</div>
                          <div style={{ textAlign: "right", fontSize: 12, color: "#64748B" }}>{c.cpc}</div>
                          <div style={{ textAlign: "center" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: t.bg, color: t.color }}>{c.ctrNum.toFixed(2)}%</span></div>
                          <input value={acNotes[nkey] ?? ""} onChange={(e) => setNote(nkey, e.target.value)} placeholder="+ note..." style={acNoteInput} />
                        </div>
                      );
                    })}
                    <div style={{ display: "grid", gridTemplateColumns: AC_GRID, gap: 8, padding: "10px 0", alignItems: "center", background: "#F8FAFC", borderRadius: 6, borderLeft: `3px solid ${g.color}` }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A", paddingLeft: 12 }}>{g.aud} total</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>{gt.cost}</div>
                      <div style={{ textAlign: "right", fontSize: 12, fontWeight: 800, color: "#0F172A" }}>{gt.imp}</div>
                      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{gt.lead}</div>
                      <div style={{ textAlign: "right", fontSize: 12, fontWeight: 800, color: "#0F172A" }}>{gt.cpl}</div>
                      <div style={{ textAlign: "right", fontSize: 12, fontWeight: 800, color: "#0F172A" }}>{gt.click}</div>
                      <div style={{ textAlign: "right", fontSize: 12, fontWeight: 800, color: "#0F172A" }}>{gt.cpc}</div>
                      <div style={{ textAlign: "center" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: gtTier.bg, color: gtTier.color }}>{gt.ctrNum.toFixed(2)}%</span></div>
                      <input value={acNotes[`${g.aud}::__group`] ?? ""} onChange={(e) => setNote(`${g.aud}::__group`, e.target.value)} placeholder="+ group note..." style={acNoteInput} />
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <div style={{ display: "grid", gridTemplateColumns: AC_GRID, gap: 8, padding: "12px 12px", alignItems: "center", background: "#0F172A", borderRadius: 8, marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Total</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{vm.audCre.grand.cost}</div>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#CBD5E1" }}>{vm.audCre.grand.imp}</div>
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800, color: "#fff" }}>{vm.audCre.grand.lead}</div>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#CBD5E1" }}>{vm.audCre.grand.cpl}</div>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#CBD5E1" }}>{vm.audCre.grand.click}</div>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#CBD5E1" }}>{vm.audCre.grand.cpc}</div>
            <div style={{ textAlign: "center" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: ctrTier(vm.audCre.grand.ctrNum).bg, color: ctrTier(vm.audCre.grand.ctrNum).color }}>{vm.audCre.grand.ctrNum.toFixed(2)}%</span></div>
            <div />
          </div>
        </div>

        {/* CREATIVE PERFORMANCE */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 13, flexWrap: "wrap", gap: 8 }}>
            <div>
              <h2 style={{ ...h2, display: "inline" }}>Creative Performance</h2>
              <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 10 }}>{vm.creativeSub}</span>
            </div>
            <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", background: "#F1F5F9", padding: "3px 8px", borderRadius: 5 }}>img drops in from image_url</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {vm.creatives.map((cr, i) => (
              <div key={i} style={{ background: "white", borderRadius: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", aspectRatio: "4 / 3", background: cr.imgBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundImage: cr.imageUrl ? undefined : `repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 6px, transparent 6px 12px), ${cr.imgBg}` }}>
                  {cr.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cr.imageUrl} alt={cr.name} loading="lazy" referrerPolicy="no-referrer" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <div style={{ position: "absolute", top: 9, left: 9, display: "flex", gap: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.28)", padding: "2px 7px", borderRadius: 20 }}>#{cr.rank}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.28)", padding: "2px 7px", borderRadius: 20 }}>{cr.format}</span>
                  </div>
                  <span style={{ position: "absolute", top: 9, right: 9, fontSize: 9, fontWeight: 700, color: cr.perfColor, background: "#fff", padding: "2px 7px", borderRadius: 20 }}>{cr.perfLabel}</span>
                  {!cr.imageUrl && (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,0.92)" }}>
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.85 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                      <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", marginTop: 5, opacity: 0.9 }}>{cr.name}</div>
                    </div>
                  )}
                </div>
                <div style={{ padding: "13px 14px 15px", display: "flex", flexDirection: "column", gap: 11 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cr.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: cr.ctrColor, letterSpacing: "-0.02em", lineHeight: 1 }}>{cr.ctr}%</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", marginBottom: 2 }}>CTR</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                    {[["CP Lead", cr.cpl], ["Leads", cr.leads], ["Spend", cr.spend]].map(([lbl, val]) => (
                      <div key={lbl}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94A3B8", fontWeight: 700, marginBottom: 2 }}>{lbl}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPTIMIZATION LOG + INSIGHTS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#94A3B8" }}>Optimization Log</h2>
              <span style={{ fontSize: 11, color: "#CBD5E1" }}>{log.length} entries</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {vm.logEntries.map((e) => (
                <div key={e.id} style={{ position: "relative", background: "#F8FAFC", borderRadius: 8, borderLeft: `3px solid ${e.accent}`, padding: "9px 14px 10px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 2 }}>{e.dateLabel}</div>
                  <div style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.45, paddingRight: 20 }}>{e.text}</div>
                  <div onClick={() => saveLog(log.filter((x) => x.id !== e.id))} title="Delete" style={{ position: "absolute", top: 8, right: 10, cursor: "pointer", color: "#CBD5E1", fontSize: 15, lineHeight: 1, fontWeight: 600 }}>×</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <input type="date" value={draftDate || vm.curE} min={vm.logMin} max={vm.logMax} onChange={(ev) => setDraftDate(ev.target.value)} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#334155", fontFamily: FONT, background: "#fff", flexShrink: 0 }} />
              <input type="text" value={draftText} onChange={(ev) => setDraftText(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && addLog()} placeholder="Add an optimization note" style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#334155", fontFamily: FONT, background: "#fff" }} />
              <div onClick={addLog} style={{ flexShrink: 0, cursor: "pointer", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 5 }}>+ Add</div>
            </div>
          </div>

          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ ...h2, marginBottom: 4 }}>Report Insights</h2>
            {MEMOS.map((m) => (
              <div key={m.date} style={{ padding: "12px 14px", background: "#F8FAFC", borderRadius: 8, borderLeft: "3px solid #2563EB" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2563EB", marginBottom: 5 }}>{m.date}</div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.6 }}>{m.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── view-model builder ─────────────────────────────────────────────── */

function buildViewModel(meta: MetaDay[], days: MetaDay[], filter: string, metrics: Metric[], log: LogEntry[], sess: { byDay: Map<string, number>; available: boolean }) {
  const isAll = filter === "All";
  const sel = filter;
  const selColor = isAll ? "#2563EB" : colorOf(sel);

  // products: stable across ranges (from full data), ordered by in-range spend desc
  const ptAll = new Map<string, Agg>();
  for (const p of new Set(meta.map((r) => r.product).filter(Boolean))) ptAll.set(p, newAgg());
  for (const r of days) {
    const o = ptAll.get(r.product);
    if (o) addRow(o, r);
  }
  const products = [...ptAll.entries()].sort((a, b) => b[1].spend - a[1].spend).map(([p]) => p);
  const pt = (p: string) => ptAll.get(p) ?? newAgg();
  const grandSpend = products.reduce((s, p) => s + pt(p).spend, 0);

  // selected aggregate
  const selRows = days.filter((r) => isAll || r.product === sel);
  let aSpend = 0, aClk = 0, aImp = 0, aConv = 0;
  for (const r of selRows) { aSpend += r.spend; aClk += r.clicks; aImp += r.impressions; aConv += r.leads; }
  const aCtr = aImp > 0 ? (aClk / aImp) * 100 : 0;
  const aCpl = aConv > 0 ? aSpend / aConv : 0;
  const avgCpl = aCpl || 600;
  const avgCtr = aCtr || 1;

  // range bounds (actual data days present)
  const rangeDays = [...new Set(days.map((r) => r.date))].sort();
  const curS = rangeDays[0];
  const curE = rangeDays[rangeDays.length - 1];
  const rangeLabel = `${fmtDay(curS)} – ${fmtDay(curE)}, 2026 · ${rangeDays.length} days`;

  const leadDefLabel = isAll ? "varies by campaign" : leadDefOf(sel);
  const leadDefColor = isAll ? "#94A3B8" : selColor;
  const headerSub = isAll
    ? `All Meta paid activity · ${rangeLabel} · ${products.length} campaigns`
    : `${sel} campaign · lead = ${leadDefOf(sel).toLowerCase()} · ${rangeLabel}`;

  // chips
  const chipDefs = [{ key: "All", label: "All", color: "#0F172A" }].concat(
    products.map((p, i) => ({ key: p, label: p, color: colorOf(p, i) }))
  );
  const chips = chipDefs.map((c) => {
    const active = filter === c.key;
    const sp = c.key === "All" ? grandSpend : pt(c.key).spend;
    return {
      key: c.key,
      label: c.label,
      active,
      share: c.key === "All" || grandSpend === 0 ? "" : `${((sp / grandSpend) * 100).toFixed(0)}%`,
      dot: c.color,
      bg: active ? c.color : "#fff",
      color: active ? "#fff" : "#475569",
      border: active ? "transparent" : "rgba(0,0,0,0.08)",
    };
  });

  const sessionsTotal = [...sess.byDay.values()].reduce((s, v) => s + v, 0);

  // KPIs — meta metrics from meta_ad_raw_data_v2; sessions from GA4 by UTM campaign
  const kpis = [
    { label: "Ad Spend", value: fmt(aSpend), unit: "₩", sub: isAll ? `Across ${products.length} campaigns` : sel, color: "#2563EB", iconBg: "#DBEAFE", iconShape: "3px", cardBg: "#fff", cardBorder: "rgba(0,0,0,0.04)", valColor: "#0F172A" },
    { label: "Impressions", value: fmt(aImp), unit: "", sub: "Total impressions", color: "#0891B2", iconBg: "#CFFAFE", iconShape: "3px", cardBg: "#fff", cardBorder: "rgba(0,0,0,0.04)", valColor: "#0F172A" },
    { label: "Clicks", value: fmt(aClk), unit: "", sub: "Link clicks", color: "#7C3AED", iconBg: "#EDE9FE", iconShape: "50%", cardBg: "#fff", cardBorder: "rgba(0,0,0,0.04)", valColor: "#0F172A" },
    { label: "CTR", value: aCtr.toFixed(2), unit: "%", sub: "Click-through rate", color: "#D97706", iconBg: "#FEF3C7", iconShape: "50%", cardBg: "#fff", cardBorder: "rgba(0,0,0,0.04)", valColor: "#0F172A" },
    { label: "Sessions", value: sess.available ? fmt(sessionsTotal) : "—", unit: "", sub: sess.available ? "Paid sessions (GA4 · UTM)" : "Not tracked (no website)", color: "#DB2777", iconBg: "#FCE7F3", iconShape: "50%", cardBg: sess.available ? "#fff" : "#FAFAF9", cardBorder: "rgba(0,0,0,0.04)", valColor: sess.available ? "#0F172A" : "#CBD5E1" },
    { label: "Leads", value: fmt(aConv), unit: "", sub: `Lead = ${leadDefLabel}`, color: "#059669", iconBg: "#DCFCE7", iconShape: "50%", cardBg: "#fff", cardBorder: "rgba(0,0,0,0.04)", valColor: "#0F172A" },
    { label: "CP Lead", value: aCpl > 0 ? fmt(aCpl) : "—", unit: "₩", sub: "Cost per lead", color: "#475569", iconBg: "#F1F5F9", iconShape: "3px", cardBg: "#fff", cardBorder: "rgba(0,0,0,0.04)", valColor: "#0F172A" },
  ];

  // daily series
  const N = rangeDays.length;
  const dayIdx = new Map(rangeDays.map((d, i) => [d, i]));
  const perDay = rangeDays.map(() => ({ spend: 0, clk: 0, imp: 0, conv: 0 }));
  for (const r of selRows) {
    const d = perDay[dayIdx.get(r.date)!];
    d.spend += r.spend; d.clk += r.clicks; d.imp += r.impressions; d.conv += r.leads;
  }

  const METRICS: Record<Metric, { label: string; color: string; empty: boolean }> = {
    leads: { label: isAll ? "Leads" : leadDefOf(sel), color: "#059669", empty: false },
    jobapp: { label: "Job applications", color: "#0891B2", empty: false },
    clicks: { label: "Clicks", color: "#7C3AED", empty: false },
    ctr: { label: "CTR", color: "#D97706", empty: false },
    sessions: { label: "Sessions", color: "#DB2777", empty: !sess.available },
    installs: { label: "App installs", color: "#475569", empty: true },
  };
  const metricBtns = (Object.keys(METRICS) as Metric[]).map((k) => {
    const active = metrics.includes(k);
    const disabled = k === "sessions" && !sess.available;
    return {
      key: k,
      label: METRICS[k].label,
      disabled,
      bg: active ? METRICS[k].color : "#fff",
      color: disabled ? "#CBD5E1" : active ? "#fff" : "#64748B",
      border: active ? "transparent" : "rgba(0,0,0,0.08)",
    };
  });

  // plot geometry
  const X0 = 62, X1 = 878, Y0 = 44, Y1 = 208;
  const xAt = (i: number) => (N > 1 ? X0 + ((X1 - X0) * i) / (N - 1) : X0);
  const spendVals = perDay.map((d) => d.spend);
  const sMax = niceMax(Math.max(...spendVals, 1));
  const yS = (v: number) => Y1 - (Y1 - Y0) * (v / sMax);
  const toPath = (vals: number[], yfn: (v: number) => number) =>
    vals.map((v, i) => (i ? "L" : "M") + xAt(i).toFixed(1) + "," + yfn(v).toFixed(1)).join(" ");
  const spendPath = toPath(spendVals, yS);
  const spendArea = `${spendPath} L${X1},${Y1} L${X0},${Y1} Z`;

  // per-metric daily series
  const seriesVals = (m: Metric): number[] => {
    if (m === "clicks") return perDay.map((d) => d.clk);
    if (m === "ctr") return perDay.map((d) => (d.imp > 0 ? (d.clk / d.imp) * 100 : 0));
    if (m === "sessions") return rangeDays.map((d) => sess.byDay.get(d) ?? 0);
    return perDay.map((d) => d.conv); // leads, jobapp
  };
  // one dashed line per selected metric, each normalized to its own max
  const lines = metrics.map((m) => {
    const info = METRICS[m];
    if (info.empty) return { key: m, empty: true, color: info.color, label: info.label, path: "", max: 1, isCtr: false, vals: [] as number[] };
    const vals = seriesVals(m);
    const mx = niceMax(Math.max(...vals, 1));
    return { key: m, empty: false, color: info.color, label: info.label, path: toPath(vals, (v) => Y1 - (Y1 - Y0) * (v / mx)), max: mx, isCtr: m === "ctr", vals };
  });
  const nonEmpty = lines.filter((l) => !l.empty);
  const trendLines = nonEmpty.map((l) => ({ path: l.path, color: l.color }));
  const legendLines = lines.map((l) => ({ color: l.color, label: l.label }));

  // per-day data for the hover tooltip
  const trend = {
    days: rangeDays,
    xs: rangeDays.map((_, i) => xAt(i)),
    costVals: spendVals,
    costMax: sMax,
    series: nonEmpty.map((l) => ({ label: l.label, color: l.color, vals: l.vals, max: l.max, isCtr: l.isCtr })),
  };

  const ticks = 4;
  const yLeft = Array.from({ length: ticks + 1 }, (_, i) => {
    const val = (sMax * i) / ticks;
    return { y: yS(val), label: val >= 1000 ? `${(val / 1000).toFixed(0)}K` : fmt(val) };
  });
  // right axis only meaningful with a single metric line; hidden when comparing several
  const showRight = nonEmpty.length === 1;
  const rightAxisColor = showRight ? nonEmpty[0].color : "#94A3B8";
  const yRight = showRight
    ? Array.from({ length: ticks + 1 }, (_, i) => {
        const mx = nonEmpty[0].max;
        const val = (mx * i) / ticks;
        return { y: Y1 - (Y1 - Y0) * (val / mx), label: nonEmpty[0].isCtr ? `${val.toFixed(1)}%` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : fmt(val) };
      })
    : [];

  const xTicks: { x: string; label: string }[] = [];
  for (let i = 0; i < N; i += 1) {
    xTicks.push({ x: xAt(i).toFixed(1), label: fmtDay(rangeDays[i]) });
  }
  const metricEmpty = metrics.length > 0 && nonEmpty.length === 0;
  const labelList = metrics.map((m) => METRICS[m].label.toLowerCase());
  const trendSub = `${isAll ? "All campaigns" : sel} · daily cost vs ${labelList.length ? labelList.join(", ") : "—"}`;
  const emptyMsg = metrics.includes("sessions") && !sess.available
    ? `Sessions not tracked for ${sel} (no website tracking)`
    : "App install tracking not yet wired";

  // top table
  const mkRow = (name: string, color: string, leadType: string, o: Agg, maxV: number, clickable: boolean, rowBg = "transparent") => {
    const cpl = o.lead > 0 ? o.spend / o.lead : 0;
    const ctr = o.imp > 0 ? (o.clk / o.imp) * 100 : 0;
    const cs = cplStyle(cpl, avgCpl);
    return {
      name, color, leadType,
      spend: fmt(o.spend), barW: ((o.spend / maxV) * 100).toFixed(1),
      leads: fmt(o.lead), cpl: cpl > 0 ? fmt(cpl) : "—", cplBg: cs.bg, cplColor: cs.color,
      clicks: fmt(o.clk), ctr: ctr.toFixed(2), ctrColor: ctrCol(ctr),
      cursor: clickable ? "pointer" : "default", rowBg,
    };
  };

  const maxSp = Math.max(...products.map((p) => pt(p).spend), 1);
  const campaignRows = products.map((p, i) =>
    mkRow(p, colorOf(p, i), leadDefOf(p), pt(p), maxSp, true, filter === p ? "rgba(37,99,235,0.05)" : "transparent")
  );

  const adsetData = isAll ? [] : groupBy(selRows, (r) => r.audience);
  const adsetMax = Math.max(...adsetData.map((a) => a.spend), 1);
  const adsetRows = adsetData.map((a, i) => mkRow(a.name, PALETTE[i % PALETTE.length], "ad set", a, adsetMax, false));

  const topRows = isAll ? campaignRows : adsetRows;

  const topTitle = isAll ? "Campaign Performance" : `Ad Set Performance — ${sel}`;
  const topSub = isAll ? `${products.length} campaigns · click a row to filter` : `${adsetData.length} ad sets · click the All chip to reset`;
  const topColHead = isAll ? "Campaign" : "Ad Set";

  const totSpend = fmt(aSpend), totLeads = fmt(aConv), totClicks = fmt(aClk);
  const totCpl = aCpl > 0 ? fmt(aCpl) : "—", totCtr = aCtr.toFixed(2);

  // donut
  const C = 2 * Math.PI * 70;
  const mixTotal = isAll ? grandSpend : aSpend;
  const mixItems = isAll
    ? products.map((p, i) => ({ name: p, spend: pt(p).spend, color: colorOf(p, i) }))
    : adsetData.map((a, i) => ({ name: a.name, spend: a.spend, color: PALETTE[i % PALETTE.length] }));
  let off = 0;
  const donutSegs = mixItems.filter((it) => it.spend > 0).map((it) => {
    const frac = mixTotal > 0 ? it.spend / mixTotal : 0;
    const len = C * frac;
    const seg = { color: it.color, dash: `${len.toFixed(1)} ${(C - len).toFixed(1)}`, offset: (-off).toFixed(1) };
    off += len;
    return seg;
  });
  const donutTotal = mixTotal >= 1000000 ? `${(mixTotal / 1000000).toFixed(2)}M` : `${Math.round(mixTotal / 1000)}K`;
  const spendLegend = mixItems.slice(0, 8).map((it) => ({ name: it.name, color: it.color, pct: `${mixTotal > 0 ? ((it.spend / mixTotal) * 100).toFixed(1) : "0.0"}%` }));
  const mixTitle = isAll ? "Spend Mix" : "Ad Set Mix";

  // creatives
  const imgByCre = new Map<string, string>();
  for (const r of selRows) if (r.imageUrl && !imgByCre.has(r.adName)) imgByCre.set(r.adName, r.imageUrl);
  const creAgg = groupBy(selRows, (r) => r.adName).map((o) => ({ ...o, ctr: o.imp > 0 ? (o.clk / o.imp) * 100 : 0 }));
  const creList = [...creAgg].sort((a, b) => b.ctr - a.ctr).slice(0, 8);
  const fmtName = (n: string) => {
    const l = n.toLowerCase();
    if (l.includes("anim")) return "Animation";
    if (l.includes("real") || l.includes("video")) return "Video";
    return "Static";
  };
  const creatives = creList.map((c, i) => {
    const cpl = c.lead > 0 ? c.spend / c.lead : 0;
    const perf = c.ctr >= avgCtr * 1.2 ? { l: "Top", c: "#059669" } : c.ctr >= avgCtr * 0.8 ? { l: "Good", c: "#D97706" } : { l: "Low", c: "#DC2626" };
    return {
      rank: String(i + 1).padStart(2, "0"), name: c.name, format: fmtName(c.name), imgBg: IMG_BGS[i % IMG_BGS.length],
      imageUrl: imgByCre.get(c.name) || "",
      ctr: c.ctr.toFixed(2), ctrColor: ctrCol(c.ctr), cpl: cpl > 0 ? fmt(cpl) : "—", leads: fmt(c.lead), spend: fmt(c.spend),
      perfLabel: perf.l, perfColor: perf.c,
    };
  });
  const creativeSub = `${isAll ? "All campaigns" : sel} · ${creList.length} creatives · sorted by CTR (high → low)`;

  // bottom breakdown
  const botSrc = (isAll ? groupBy(days, (r) => r.audience) : groupBy(selRows, (r) => r.adName)).slice(0, 8);
  const botMaxSp = Math.max(...botSrc.map((a) => a.spend), 1);
  const botSpendTot = botSrc.reduce((s, a) => s + a.spend, 0);
  const botRows = botSrc.map((a, i) => {
    const cpl = a.lead > 0 ? a.spend / a.lead : 0;
    const ctr = a.imp > 0 ? (a.clk / a.imp) * 100 : 0;
    const cs = cplStyle(cpl, avgCpl);
    return {
      name: a.name, color: PALETTE[i % PALETTE.length], spend: fmt(a.spend), barW: ((a.spend / botMaxSp) * 100).toFixed(1),
      share: `${botSpendTot > 0 ? ((a.spend / botSpendTot) * 100).toFixed(0) : "0"}%`,
      leads: fmt(a.lead), cpl: cpl > 0 ? fmt(cpl) : "—", cplBg: cs.bg, cplColor: cs.color, clicks: fmt(a.clk), ctr: ctr.toFixed(2), ctrColor: ctrCol(ctr),
    };
  });
  const botTitle = isAll ? "Audience Breakdown" : `Creative Breakdown — ${sel}`;
  const botColHead = isAll ? "Audience · Spend (₩)" : "Creative · Spend (₩)";
  const botSub = isAll ? `${botRows.length} audiences across all campaigns` : `${botRows.length} creatives in ${sel}`;

  // optimization log
  const logSorted = [...log].sort((a, b) => b.date.localeCompare(a.date));
  const logEntries = logSorted.map((e, i) => ({ id: e.id, dateLabel: fmtDay(e.date), text: e.text, accent: i % 2 === 0 ? "#7C3AED" : "#059669" }));
  const inRangeLog = log.filter((e) => e.date >= curS && e.date <= curE).sort((a, b) => a.date.localeCompare(b.date));
  const optMarkers = inRangeLog
    .map((e, i) => { const di = rangeDays.indexOf(e.date); return di >= 0 ? { x: xAt(di).toFixed(1), n: i + 1 } : null; })
    .filter((x): x is { x: string; n: number } => x !== null);
  const optLegend = inRangeLog
    .map((e, i) => { const di = rangeDays.indexOf(e.date); return di >= 0 ? { n: i + 1, date: fmtDay(e.date), action: e.text } : null; })
    .filter((x): x is { n: number; date: string; action: string } => x !== null);

  // Audience × Creative — group by audience, then by creative (current scope)
  const acMap = new Map<string, Map<string, Agg>>();
  for (const r of selRows) {
    const aud = r.audience || "(none)";
    let cm = acMap.get(aud);
    if (!cm) acMap.set(aud, (cm = new Map<string, Agg>()));
    const cre = r.adName || "(none)";
    let o = cm.get(cre);
    if (!o) cm.set(cre, (o = newAgg()));
    addRow(o, r);
  }
  const acRow = (name: string, color: string, o: Agg, maxSpend: number) => ({
    key: name, name, color,
    cost: fmt(o.spend), costBarW: ((o.spend / maxSpend) * 100).toFixed(1),
    imp: fmt(o.imp), lead: fmt(o.lead),
    cpl: o.lead > 0 ? fmt(o.spend / o.lead) : "—",
    click: fmt(o.clk), cpc: o.clk > 0 ? fmt(o.spend / o.clk) : "—",
    ctrNum: o.imp > 0 ? (o.clk / o.imp) * 100 : 0,
  });
  const acRaw = [...acMap.entries()]
    .map(([aud, cm]) => {
      const cres = [...cm.entries()].map(([name, o]) => ({ name, o })).filter((c) => c.o.spend > 0 || c.o.imp > 0).sort((a, b) => b.o.spend - a.o.spend);
      const gMax = Math.max(...cres.map((c) => c.o.spend), 1);
      const gt = newAgg();
      for (const c of cres) { gt.spend += c.o.spend; gt.imp += c.o.imp; gt.clk += c.o.clk; gt.lead += c.o.lead; }
      return { aud, cres, gMax, gt };
    })
    .filter((g) => g.cres.length > 0)
    .sort((a, b) => b.gt.spend - a.gt.spend);
  const acGroups = acRaw.map((g, gi) => ({
    aud: g.aud,
    color: PALETTE[gi % PALETTE.length],
    count: g.cres.length,
    creatives: g.cres.map((c, ci) => acRow(c.name, PALETTE[ci % PALETTE.length], c.o, g.gMax)),
    total: acRow(g.aud, PALETTE[gi % PALETTE.length], g.gt, g.gMax),
  }));
  const acGrandAgg = newAgg();
  for (const g of acRaw) { acGrandAgg.spend += g.gt.spend; acGrandAgg.imp += g.gt.imp; acGrandAgg.clk += g.gt.clk; acGrandAgg.lead += g.gt.lead; }
  const audCre = {
    groups: acGroups,
    grand: acRow("Total", "#0F172A", acGrandAgg, Math.max(acGrandAgg.spend, 1)),
    groupCount: acGroups.length,
    totalLeads: acGrandAgg.lead,
  };

  return {
    isAll, headerSub, leadDefLabel, leadDefColor, chips, kpis, products,
    curS, curE, logMin: rangeDays[0], logMax: rangeDays[rangeDays.length - 1],
    trendSub, metricBtns, legendLines, trendLines, rightAxisColor, trend,
    spendPath, spendArea, yLeft, yRight, xTicks, metricEmpty, emptyMsg,
    optMarkers, optLegend,
    topRows, topTitle, topSub, topColHead, totSpend, totLeads, totCpl, totClicks, totCtr,
    donutSegs, donutTotal, spendLegend, mixTitle,
    creatives, creativeSub, botRows, botTitle, botSub, botColHead, logEntries, audCre,
  };
}

/* ── shared style objects ───────────────────────────────────────────── */

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

const th: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94A3B8" };

const tot: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#0F172A" };

const acNoteInput: React.CSSProperties = { width: "100%", border: "1px solid #E2E8F0", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#334155", fontFamily: FONT, background: "#fff", outline: "none" };

function FontLink() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
  );
}
