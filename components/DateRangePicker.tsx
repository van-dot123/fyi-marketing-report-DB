"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const TODAY = "2026-06-01";
const DEFAULT_START = "2026-05-01";
const DEFAULT_END = "2026-05-31";

interface DateRangeValue {
  start: string;
  end: string;
}

interface DateRangeContextValue extends DateRangeValue {
  previousStart: string;
  previousEnd: string;
  setRange: (start: string, end: string) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

function previousPeriod(start: string, end: string) {
  const days =
    Math.round((fromISO(end).getTime() - fromISO(start).getTime()) / 86400000) + 1;
  return {
    previousStart: toISO(addDays(fromISO(start), -days)),
    previousEnd: toISO(addDays(fromISO(start), -1)),
  };
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRangeValue>({
    start: DEFAULT_START,
    end: DEFAULT_END,
  });
  const { previousStart, previousEnd } = previousPeriod(range.start, range.end);
  return (
    <DateRangeContext.Provider
      value={{
        ...range,
        previousStart,
        previousEnd,
        setRange: (start, end) => setRange({ start, end }),
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function fmtLong(s: string): string {
  return fromISO(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

interface Preset {
  label: string;
  start?: string;
  end?: string;
  custom?: boolean;
}

function buildPresets(): Preset[] {
  const today = fromISO(TODAY);
  const yesterday = addDays(today, -1);
  const monthStart = startOfMonth(today);
  const lastMonthStart = addMonths(monthStart, -1);

  return [
    { label: "Yesterday", start: toISO(yesterday), end: toISO(yesterday) },
    { label: "Last 7 days", start: toISO(addDays(yesterday, -6)), end: toISO(yesterday) },
    { label: "Last 28 days", start: toISO(addDays(yesterday, -27)), end: toISO(yesterday) },
    { label: "This month", start: toISO(monthStart), end: toISO(addDays(addMonths(monthStart, 1), -1)) },
    { label: "Last month", start: toISO(lastMonthStart), end: toISO(addDays(monthStart, -1)) },
    { label: "W18-19", start: "2026-05-01", end: "2026-05-10" },
    { label: "W20-22", start: "2026-05-11", end: "2026-05-31" },
    { label: "Custom", custom: true },
  ];
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthGrid(view: Date): Date[] {
  const first = startOfMonth(view);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function MonthView({
  view,
  draftStart,
  draftEnd,
  onPick,
}: {
  view: Date;
  draftStart: string;
  draftEnd: string;
  onPick: (iso: string) => void;
}) {
  return (
    <div className="w-64">
      <div className="mb-2 text-center text-sm font-semibold text-slate-700">
        {monthLabel(view)}
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-slate-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(view).map((day) => {
          const iso = toISO(day);
          const inMonth = day.getMonth() === view.getMonth();
          const isStart = iso === draftStart;
          const isEnd = iso === draftEnd;
          const endpoint = isStart || isEnd;
          const between =
            !!draftStart && !!draftEnd && iso > draftStart && iso < draftEnd;

          return (
            <button
              key={iso}
              onClick={() => onPick(iso)}
              className={[
                "h-9 text-sm transition-colors",
                between ? "bg-purple-100" : "",
                isStart ? "rounded-l-lg" : "",
                isEnd ? "rounded-r-lg" : "",
                endpoint
                  ? "bg-purple-600 font-semibold text-white"
                  : between
                  ? "text-purple-900"
                  : inMonth
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker() {
  const { start, end, setRange } = useDateRange();
  const presets = useMemo(buildPresets, []);

  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [view, setView] = useState(() => startOfMonth(fromISO(start)));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPicker = () => {
    setDraftStart(start);
    setDraftEnd(end);
    setView(startOfMonth(fromISO(start)));
    setOpen(true);
  };

  const pickDay = (iso: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(iso);
      setDraftEnd("");
    } else if (iso < draftStart) {
      setDraftStart(iso);
    } else {
      setDraftEnd(iso);
    }
  };

  const applyPreset = (p: Preset) => {
    if (p.custom || !p.start || !p.end) return;
    setDraftStart(p.start);
    setDraftEnd(p.end);
    setView(startOfMonth(fromISO(p.start)));
  };

  const activePreset = useMemo(() => {
    const match = presets.find(
      (p) => p.start === draftStart && p.end === draftEnd
    );
    return match ? match.label : "Custom";
  }, [presets, draftStart, draftEnd]);

  const apply = () => {
    const finalStart = draftStart;
    const finalEnd = draftEnd || draftStart;
    if (finalStart) setRange(finalStart, finalEnd);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Calendar className="h-4 w-4 text-slate-400" />
        {fmtLong(start)} - {fmtLong(end)}
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 flex w-[720px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex">
            <ul className="w-44 shrink-0 border-r border-slate-100 p-2">
              {presets.map((p) => {
                const isActive = p.custom
                  ? activePreset === "Custom"
                  : p.label === activePreset;
                return (
                  <li key={p.label}>
                    <button
                      onClick={() => applyPreset(p)}
                      disabled={p.custom}
                      className={[
                        "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-purple-50 font-semibold text-purple-700"
                          : "text-slate-600 hover:bg-slate-50",
                        p.custom ? "cursor-default" : "",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex-1 p-4">
              <div className="flex items-start gap-6">
                <div className="flex items-center">
                  <button
                    onClick={() => setView(addMonths(view, -1))}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>

                <MonthView
                  view={view}
                  draftStart={draftStart}
                  draftEnd={draftEnd}
                  onPick={pickDay}
                />
                <MonthView
                  view={addMonths(view, 1)}
                  draftStart={draftStart}
                  draftEnd={draftEnd}
                  onPick={pickDay}
                />

                <div className="flex items-center">
                  <button
                    onClick={() => setView(addMonths(view, 1))}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draftStart}
                onChange={(e) => {
                  setDraftStart(e.target.value);
                  if (e.target.value) setView(startOfMonth(fromISO(e.target.value)));
                }}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={draftEnd}
                min={draftStart}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                disabled={!draftStart}
                className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
