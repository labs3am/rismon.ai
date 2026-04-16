-- Add columns to scan_sessions for size tracking and duplicate detection
ALTER TABLE public.scan_sessions
  ADD COLUMN IF NOT EXISTS repo_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS duplicate_of uuid,
  ADD COLUMN IF NOT EXISTS plan_at_scan text DEFAULT 'free';

-- Add monthly scan tracking table for Pro users (existing scan_usage tracks weekly for free)
CREATE TABLE IF NOT EXISTS public.scan_usage_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_start date NOT NULL DEFAULT (date_trunc('month', now()))::date,
  scan_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, month_start)
);

ALTER TABLE public.scan_usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own monthly usage"
  ON public.scan_usage_monthly
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Helper function to get user's plan (security definer to avoid RLS recursion in edge fn calls)
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(plan, 'free') FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Index to speed up duplicate-scan lookup (same user + same repo within 24h)
CREATE INDEX IF NOT EXISTS idx_scan_sessions_user_repo_recent
  ON public.scan_sessions (user_id, repo_name, created_at DESC);

-- Index to speed up active-session check
CREATE INDEX IF NOT EXISTS idx_scan_sessions_user_status
  ON public.scan_sessions (user_id, status)
  WHERE status IN ('pending', 'analyzing');