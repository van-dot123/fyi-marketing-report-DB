"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Lang = "en" | "ko";

// Korean translations keyed by the English source string.
// Any string not present here falls back to English, so the UI never breaks.
const KO: Record<string, string> = {
  // Brand / chrome
  "FYI Vietnam · 2026": "FYI Vietnam · 2026",
  // Navigation / page titles
  Overview: "개요",
  "Paid Channel": "유료 채널",
  "Daily Report": "일일 리포트",
  "Organic SNS": "오가닉 SNS",
  Funnel: "퍼널",
  "WoW Alerts": "주간 알림",

  // Common metric labels (shared across pages)
  Spend: "지출",
  "Ad Spend": "광고 지출",
  "Total Spend ₩": "총 지출 ₩",
  Impressions: "노출수",
  Impression: "노출수",
  Clicks: "클릭수",
  Click: "클릭수",
  CTR: "클릭률(CTR)",
  Sessions: "세션",
  "Total Sessions": "총 세션",
  Leads: "리드",
  Lead: "리드",
  "CP Lead": "리드당 비용",
  CPC: "클릭당 비용(CPC)",
  "Cost per lead": "리드당 비용",
  "Link clicks": "링크 클릭",
  "Click-through rate": "클릭률",
  "Total impressions": "총 노출수",
  Note: "메모",
  Cost: "비용",
  Creative: "크리에이티브",

  // Lead definitions
  Submissions: "제출",
  Applicants: "지원자",
  "App installs": "앱 설치",
  "CV registrations": "이력서 등록",
  "Form submits": "양식 제출",
  Registrations: "등록",

  // Daily Report
  "Daily Report · Meta Ads": "일일 리포트 · 메타 광고",
  "FYI Daily Performance": "FYI 일일 성과",
  "All Meta campaigns": "전체 메타 캠페인",
  "DoD vs": "전일 대비",
  "Ad Spend is month-to-date": "광고 지출은 월 누계 기준",
  "Month-to-date": "월 누계",
  "Report day": "리포트 일자",
  "Paid sessions (GA4)": "유료 세션 (GA4)",
  "Top audience": "상위 오디언스",
  "Top creative": "상위 크리에이티브",
  "MTD · vs prior period": "월 누계 · 이전 기간 대비",
  "No data this month": "이번 달 데이터 없음",
  "No Meta data available.": "사용 가능한 메타 데이터가 없습니다.",
  "lead =": "리드 =",
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string) => string;
}

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const s = localStorage.getItem("fyi_lang");
      if (s === "ko" || s === "en") setLangState(s);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("fyi_lang", l);
    } catch {
      /* ignore */
    }
  };

  const t = (s: string) => (lang === "ko" ? KO[s] ?? s : s);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useT(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: "en", setLang: () => {}, t: (s: string) => s };
  return ctx;
}

export function LangToggle() {
  const { lang, setLang } = useT();
  const opts: { key: Lang; label: string }[] = [
    { key: "en", label: "EN" },
    { key: "ko", label: "한국어" },
  ];
  return (
    <div style={{ display: "inline-flex", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => setLang(o.key)}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: lang === o.key ? "#0F172A" : "#fff",
            color: lang === o.key ? "#fff" : "#64748B",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
