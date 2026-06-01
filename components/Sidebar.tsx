"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Share2,
  Filter,
  BellRing,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/paid", label: "Paid Channel", icon: Megaphone },
  { href: "/sns", label: "Organic SNS", icon: Share2 },
  { href: "/funnel", label: "Funnel", icon: Filter },
  { href: "/alerts", label: "WoW Alerts", icon: BellRing },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-[#1a1a2e] px-4 py-6 text-slate-300">
      <div className="mb-10 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 font-bold text-white">
          F
        </div>
        <span className="text-xl font-bold tracking-tight text-white">FYI</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 text-xs text-slate-500">
        FYI Vietnam · 2026
      </div>
    </aside>
  );
}
