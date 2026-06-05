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

// Append the internal-team exclusion to a query for tables that define a filter.
export function excludeInternal<T>(query: T, table: string): T {
  const f = INTERNAL_FILTERS[table];
  return f ? ((query as any).not(f.column, "ilike", f.pattern) as T) : query;
}

type SbResult = { data?: any; count?: number | null; error: any };

// Run a query with the internal exclusion, falling back to an unfiltered run if
// the filtered query errors (e.g. the column does not exist). The caller's
// `build` receives an `applyFilter` to insert the exclusion mid-chain.
export async function runWithInternalFilter(
  table: string,
  build: (applyFilter: (q: any) => any) => PromiseLike<SbResult>
): Promise<SbResult> {
  const res = await build((q) => excludeInternal(q, table));
  if (res.error && table in INTERNAL_FILTERS) {
    console.warn(`[supabase] ${table}: internal filter skipped (${res.error?.message ?? res.error})`);
    return build((q) => q);
  }
  return res;
}

