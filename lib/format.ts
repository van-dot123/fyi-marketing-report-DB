export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatVnd(value: number): string {
  return Math.round(value).toLocaleString("vi-VN");
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(0)}%`;
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
  if (unit === "currency") return formatCurrency(value);
  if (unit === "percent") return formatPercent(value);
  return formatNumber(value);
}
