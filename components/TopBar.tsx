"use client";

import { useState } from "react";

const presets = ["May", "W18-19", "W20-22"];

export default function TopBar({ title }: { title: string }) {
  const [active, setActive] = useState("May");

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        {presets.map((preset) => {
          const isActive = preset === active;
          return (
            <button
              key={preset}
              onClick={() => setActive(preset)}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              {preset}
            </button>
          );
        })}
      </div>
    </header>
  );
}
