"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Share2,
  Filter,
  BellRing,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "paid", label: "Paid Channel", icon: Megaphone },
  { key: "organic", label: "Organic SNS", icon: Share2 },
  { key: "funnel", label: "Funnel", icon: Filter },
  { key: "alerts", label: "WoW Alerts", icon: BellRing },
];

export default function Sidebar() {
  const [active, setActive] = useState("overview");

  return (
    <aside className="flex h-full w-60 flex-col bg-[#1a1a2e] px-4 py-6 text-slate-300">
      <div className="mb-10 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 font-bold text-white">
          F
        </div>
        <span className="text-xl font-bold tracking-tight text-white">FYI</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-3 text-xs text-slate-500">
        FYI Vietnam · 2026
      </div>
    </aside>
  );
}
