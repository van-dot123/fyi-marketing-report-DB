"use client";

import { usePathname } from "next/navigation";
import { useT } from "@/components/LanguageProvider";

const titles: Record<string, string> = {
  "/": "Overview",
  "/paid": "Paid Channel",
  "/daily": "Daily Report",
  "/sns": "Organic SNS",
  "/funnel": "Funnel",
  "/alerts": "WoW Alerts",
};

export default function PageTitle() {
  const pathname = usePathname();
  const { t } = useT();
  const title = titles[pathname] ?? "Overview";
  return <h1 className="text-2xl font-bold text-slate-900">{t(title)}</h1>;
}
