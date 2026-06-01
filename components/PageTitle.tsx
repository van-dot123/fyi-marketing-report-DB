"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/": "Overview",
  "/paid": "Paid Channel",
  "/sns": "Organic SNS",
  "/funnel": "Funnel",
  "/alerts": "WoW Alerts",
};

export default function PageTitle() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Overview";
  return <h1 className="text-2xl font-bold text-slate-900">{title}</h1>;
}
