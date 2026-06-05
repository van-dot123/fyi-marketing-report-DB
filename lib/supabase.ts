import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

// Internal team accounts share the @likelion.net domain — excluded from all
// metrics. `EMAIL_TABLES` lists the tables that expose an `email` column.
export const INTERNAL_EMAIL_PATTERN = "%@likelion.net%";
export const INTERNAL_EXCLUDE_NOTE = "Excludes @likelion.net";
export const EMAIL_TABLES = new Set(["submissions", "job_applications"]);

// Append the internal-team exclusion to a query when the table has an email column.
export function excludeInternal<T>(query: T, table: string): T {
  return EMAIL_TABLES.has(table)
    ? ((query as any).not("email", "ilike", INTERNAL_EMAIL_PATTERN) as T)
    : query;
}

