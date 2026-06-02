export const formatKRW = (n: number) => Math.round(n || 0).toLocaleString("en-US") + " ₩";

export const formatCount = (n: number) => Math.round(n || 0).toLocaleString("en-US");

export const formatPct = (n: number) => (n || 0).toFixed(2) + "%";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function formatPeriod(start: string, end: string): string {
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

export type Unit = "currency" | "number" | "percent";

export function formatValue(value: number, unit: Unit): string {
  if (unit === "currency") return formatKRW(value);
  if (unit === "percent") return formatPercent(value);
  return formatNumber(value);
}
