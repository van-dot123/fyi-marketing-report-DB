import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

// Internal team records are excluded from all metrics. Each table defines the
// column + ILIKE pattern that identifies an internal record:
//   submissions      → company contains "Likelion" (e.g. "LIKELION VN")
//   job_applications → applicant_email on the @likelion.net domain
// (Sign-ups are filtered inside the get_signups_count() RPC on auth.users.email.)
const INTERNAL_FILTERS: Record<string, { column: string; pattern: string }> = {
  submissions: { column: "company", pattern: "%likelion%" },
  job_applications: { column: "applicant_email", pattern: "%@likelion.net%" },
};

export const NOTE_EXCLUDE_COMPANY = "Excludes Likelion";
export const NOTE_EXCLUDE_EMAIL = "Excludes @likelion.net";

// Earliest valid created_at per table — records before this are test/junk data
// and are dropped from every query. Submissions only count from 2026-04-19 on.
const TABLE_MIN_CREATED_AT: Record<string, string> = {
  submissions: new Date("2026-04-19T00:00:00").toISOString(),
};

// Append the internal-team exclusion to a query for tables that define a filter.
export function excludeInternal<T>(query: T, table: string): T {
  const f = INTERNAL_FILTERS[table];
  return f ? ((query as any).not(f.column, "ilike", f.pattern) as T) : query;
}

// Clamp a query's created_at to the table's minimum valid date, if any.
function applyCreatedAtFloor<T>(query: T, table: string): T {
  const floor = TABLE_MIN_CREATED_AT[table];
  return floor ? ((query as any).gte("created_at", floor) as T) : query;
}

type SbResult = { data?: any; count?: number | null; error: any };

// Run a query with the created_at floor + internal exclusion, falling back to a
// run without the internal filter if it errors (e.g. the column does not exist).
// The date floor is always kept. `build` receives an `applyFilter` to insert
// these constraints mid-chain.
export async function runWithInternalFilter(
  table: string,
  build: (applyFilter: (q: any) => any) => PromiseLike<SbResult>
): Promise<SbResult> {
  const res = await build((q) => excludeInternal(applyCreatedAtFloor(q, table), table));
  if (res.error && table in INTERNAL_FILTERS) {
    console.warn(`[supabase] ${table}: internal filter skipped (${res.error?.message ?? res.error})`);
    return build((q) => applyCreatedAtFloor(q, table));
  }
  return res;
}

