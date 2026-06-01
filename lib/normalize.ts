export function parseMetaNum(s: string): number {
  return parseFloat(String(s ?? "").replace(/\./g, "").replace(",", ".")) || 0;
}

export function intNum(s: string): number {
  return parseInt(String(s ?? "").replace(/\D/g, ""), 10) || 0;
}

export function dayOf(s: string): string {
  return String(s ?? "").slice(0, 10);
}

export function isoWeek(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = Date.UTC(d.getUTCFullYear(), 0, 4);
  return 1 + Math.round((d.getTime() - firstThursday) / 604800000);
}

export function weekLabel(date: string): string {
  return date ? `W${isoWeek(date)}` : "";
}
