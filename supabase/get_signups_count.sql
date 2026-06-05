-- Sign-ups count from auth.users, excluding internal @likelion.net team accounts.
-- Run this in the Supabase SQL Editor to (re)create the RPC used by the
-- Overview and Funnel pages. SECURITY DEFINER lets the anon role read auth.users.
CREATE OR REPLACE FUNCTION get_signups_count(start_date timestamptz, end_date timestamptz)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM auth.users
  WHERE created_at >= start_date
    AND created_at <= end_date
    AND email NOT ILIKE '%@likelion.net%';
$$;
