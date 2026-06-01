"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type DateRange = "May" | "W18-19" | "W20-22";

const presets: DateRange[] = ["May", "W18-19", "W20-22"];

interface DateRangeContextValue {
  range: DateRange;
  setRange: (range: DateRange) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRange>("May");
  return (
    <DateRangeContext.Provider value={{ range, setRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}

export default function DateRangePicker() {
  const { range, setRange } = useDateRange();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {presets.map((preset) => {
        const isActive = preset === range;
        return (
          <button
            key={preset}
            onClick={() => setRange(preset)}
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
  );
}
