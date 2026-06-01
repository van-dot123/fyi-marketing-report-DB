export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(0)}%`;
}
