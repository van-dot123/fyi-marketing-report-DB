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

  // Paid Channel page
  "Paid Channels · Meta Ads": "유료 채널 · 메타 광고",
  "FYI Paid Media Report": "FYI 유료 미디어 리포트",
  "Lead definition": "리드 정의",
  "Lead =": "리드 =",
  "varies by campaign": "캠페인별 상이",
  "count the latest campaign only. Earlier mis-configured campaigns spent budget without valid results and are excluded so KPIs (CPL, CTR, spend) stay accurate.":
    "최신 캠페인만 집계합니다. 이전의 잘못 설정된 캠페인은 예산만 소진하고 유효한 결과가 없어, KPI(CPL·CTR·지출) 정확도를 위해 제외했습니다.",
  "Campaign:": "캠페인:",
  Across: "총",
  campaigns: "개 캠페인",
  "All campaigns": "전체 캠페인",
  "Daily Trend": "일별 추이",
  "Cost vs": "비용 대비",
  "daily cost vs": "일별 비용 대비",
  "Cost (₩)": "비용 (₩)",
  "Job applications": "입사 지원",
  "Not tracked for this campaign": "이 캠페인은 추적되지 않음",
  "Paid sessions (GA4 · UTM)": "유료 세션 (GA4 · UTM)",
  "Not tracked (no website)": "추적 안 됨 (웹사이트 없음)",
  "Sessions not tracked for": "세션 미추적:",
  "(no website tracking)": "(웹사이트 추적 없음)",
  "App install tracking not yet wired": "앱 설치 추적 미연동",
  "Optimization log ↑": "최적화 로그 ↑",
  "Spend (₩)": "지출 (₩)",
  "Campaign Performance": "캠페인 성과",
  "Ad Set Performance": "광고 세트 성과",
  "campaigns · click a row to filter": "개 캠페인 · 행 클릭 시 필터",
  "ad sets · click the All chip to reset": "개 광고 세트 · All 클릭 시 초기화",
  Campaign: "캠페인",
  "Ad Set": "광고 세트",
  "₩ total": "₩ 합계",
  "Spend Mix": "지출 구성",
  "Ad Set Mix": "광고 세트 구성",
  "Creative Performance": "크리에이티브 성과",
  "creatives · sorted by CTR (high → low)": "개 크리에이티브 · CTR 높은순",
  "img drops in from image_url": "이미지는 image_url에서 표시",
  "Audience Breakdown": "오디언스 분석",
  "Creative Breakdown": "크리에이티브 분석",
  "Audience · Spend (₩)": "오디언스 · 지출 (₩)",
  "Creative · Spend (₩)": "크리에이티브 · 지출 (₩)",
  "audiences across all campaigns": "개 오디언스 (전체 캠페인)",
  "creatives in": "개 크리에이티브 ·",
  "Audience × Creative": "오디언스 × 크리에이티브",
  "Per-creative performance by audience": "오디언스별 크리에이티브 성과",
  groups: "개 그룹",
  "total leads": "총 리드",
  total: "합계",
  Total: "합계",
  "+ note...": "+ 메모...",
  "+ group note...": "+ 그룹 메모...",
  "Optimization Log": "최적화 로그",
  entries: "개 항목",
  "Add an optimization note": "최적화 메모 추가",
  "+ Add": "+ 추가",
  "Report Insights": "리포트 인사이트",
  "No paid data in range": "기간 내 유료 데이터 없음",
  "No FYI Meta campaigns found for the selected dates.": "선택한 기간에 FYI 메타 캠페인이 없습니다.",

  // Date range picker
  Yesterday: "어제",
  "Last 7 days": "최근 7일",
  "Last 28 days": "최근 28일",
  "This month": "이번 달",
  "Last month": "지난 달",
  "This report week": "이번 리포트 주",
  "Last report week": "지난 리포트 주",
  Custom: "사용자 지정",
  Cancel: "취소",
  Apply: "적용",
  Su: "일",
  Mo: "월",
  Tu: "화",
  We: "수",
  Th: "목",
  Fr: "금",
  Sa: "토",

  // Overview page
  "Monthly target progress": "월간 목표 진행률",
  "Key metrics": "주요 지표",
  "Daily trend": "일별 추이",
  "Optimization log": "최적화 로그",
  "Monthly targets": "월간 목표",
  "Sessions by page": "페이지별 세션",
  "Traffic breakdown": "트래픽 구성",
  "Funnel snapshot": "퍼널 스냅샷",
  "View full funnel": "전체 퍼널 보기",
  "Quick glance": "한눈에 보기",
  "View all": "전체 보기",
  "Best paid creative": "최고 유료 크리에이티브",
  "See more": "더 보기",
  "Show less": "접기",
  vs: "대비",
  KPI: "KPI",
  Target: "목표",
  Actual: "실적",
  "Ach.": "달성률",
  "CTR%": "CTR%",
  "CP Sub ₩": "제출당 비용 ₩",
  "CP Job App ₩": "지원당 비용 ₩",
  "Job Apps": "입사 지원",
  "Job apps": "입사 지원",
  "Sign-ups": "가입",
  "Subs + Apps": "제출 + 지원",
  "Budget ₩": "예산 ₩",
  "Salary page": "급여 페이지",
  "Salary Page": "급여 페이지",
  "Job page": "채용 페이지",
  "Job Page": "채용 페이지",
  Other: "기타",
  "Paid (Meta)": "유료 (메타)",
  "Direct & other": "직접 & 기타",
  Direct: "직접",
  Referral: "추천",
  "GOOGLE_SHEETS_API_KEY is missing — live data may be unavailable.": "GOOGLE_SHEETS_API_KEY 누락 — 실시간 데이터를 사용할 수 없습니다.",
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
