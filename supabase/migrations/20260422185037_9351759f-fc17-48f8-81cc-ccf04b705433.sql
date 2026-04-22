
-- ============================================================================
-- 1. ADMIN-ONLY RPCs (privacy-safe — no report content exposed)
-- ============================================================================

-- List all users with safe metadata only
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  plan text,
  pro_credits integer,
  pro_until timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  scan_count bigint,
  app_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    COALESCE(p.plan, 'free') AS plan,
    p.pro_credits,
    p.pro_until,
    p.created_at,
    u.last_sign_in_at,
    (SELECT COUNT(*) FROM public.analyses a WHERE a.user_id = p.id)::bigint AS scan_count,
    (SELECT COUNT(*) FROM public.apps ap WHERE ap.user_id = p.id)::bigint AS app_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC NULLS LAST;
END;
$$;

-- Aggregate platform stats (no per-user report content)
CREATE OR REPLACE FUNCTION public.admin_user_stats()
RETURNS TABLE (
  total_users bigint,
  total_scans bigint,
  total_apps bigint,
  scans_this_week bigint,
  signups_this_week bigint,
  pro_users bigint,
  waitlist_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::bigint,
    (SELECT COUNT(*) FROM public.analyses)::bigint,
    (SELECT COUNT(*) FROM public.apps)::bigint,
    (SELECT COUNT(*) FROM public.analyses WHERE created_at > now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM public.profiles WHERE (pro_until IS NOT NULL AND pro_until > now()) OR pro_credits > 0)::bigint,
    (SELECT COUNT(*) FROM public.waitlist)::bigint;
END;
$$;

-- Top users by scan count (no report content)
CREATE OR REPLACE FUNCTION public.admin_top_scanners(_limit integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  scan_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    COUNT(a.id)::bigint
  FROM public.profiles p
  LEFT JOIN public.analyses a ON a.user_id = p.id
  GROUP BY p.id, p.email, p.full_name
  HAVING COUNT(a.id) > 0
  ORDER BY COUNT(a.id) DESC
  LIMIT _limit;
END;
$$;

-- Recent signups feed
CREATE OR REPLACE FUNCTION public.admin_recent_signups(_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT _limit;
END;
$$;

-- Recent scans (metadata only — no findings, no code, no summary)
CREATE OR REPLACE FUNCTION public.admin_recent_scans(_limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  user_email text,
  scan_type text,
  status text,
  files_scanned integer,
  scan_duration_seconds integer,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    p.email,
    a.scan_type,
    a.status,
    a.files_scanned,
    a.scan_duration_seconds,
    a.created_at
  FROM public.analyses a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.created_at DESC
  LIMIT _limit;
END;
$$;

-- Admin delete a user (cascades through auth.users)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account from this panel';
  END IF;

  DELETE FROM auth.users WHERE id = _target_user_id;
END;
$$;

-- ============================================================================
-- 2. EMAIL NOTIFICATION TRIGGERS (async via pg_net)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Settings table (stores edge function URL + service role key)
CREATE TABLE IF NOT EXISTS public.admin_notify_settings (
  id integer PRIMARY KEY DEFAULT 1,
  function_url text NOT NULL,
  service_role_key text NOT NULL,
  CONSTRAINT singleton CHECK (id = 1)
);

ALTER TABLE public.admin_notify_settings ENABLE ROW LEVEL SECURITY;

-- Nobody can read this (contains service role key). Only triggers (security definer) access it.
CREATE POLICY "no read" ON public.admin_notify_settings FOR SELECT USING (false);

-- Seed with the project's known values (will be set via SQL after migration)
INSERT INTO public.admin_notify_settings (id, function_url, service_role_key)
VALUES (
  1,
  'https://ljvoahftcmyckgqkigrs.supabase.co/functions/v1/admin-notify',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Helper to call the admin-notify edge function async
CREATE OR REPLACE FUNCTION public.notify_admin_event(_event text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  SELECT function_url, service_role_key INTO _url, _key
  FROM public.admin_notify_settings WHERE id = 1;

  IF _url IS NULL OR _key IS NULL OR _key = '' THEN
    RETURN; -- not configured yet, fail silent
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object('event', _event, 'data', _payload)
  );
EXCEPTION WHEN OTHERS THEN
  -- never break the originating insert
  NULL;
END;
$$;

-- Trigger: new signup
CREATE OR REPLACE FUNCTION public.on_new_user_notify_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admin_event(
    'new_signup',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_new_user_notify_admin ON auth.users;
CREATE TRIGGER trg_on_new_user_notify_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.on_new_user_notify_admin();

-- Trigger: first scan completed (status transitions to 'complete' AND user has no other complete scans)
CREATE OR REPLACE FUNCTION public.on_first_scan_notify_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prior_complete_count integer;
  _user_email text;
BEGIN
  -- Only fire when status becomes 'complete'
  IF NEW.status IS DISTINCT FROM 'complete' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'complete' THEN
    RETURN NEW; -- already was complete, ignore
  END IF;

  -- Count this user's other complete scans (excluding this row)
  SELECT COUNT(*) INTO _prior_complete_count
  FROM public.analyses
  WHERE user_id = NEW.user_id
    AND status = 'complete'
    AND id <> NEW.id;

  IF _prior_complete_count > 0 THEN
    RETURN NEW; -- not their first
  END IF;

  SELECT email INTO _user_email FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.notify_admin_event(
    'first_scan',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'email', _user_email,
      'analysis_id', NEW.id,
      'scan_type', NEW.scan_type,
      'completed_at', now()
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_first_scan_notify_admin ON public.analyses;
CREATE TRIGGER trg_on_first_scan_notify_admin
AFTER INSERT OR UPDATE OF status ON public.analyses
FOR EACH ROW EXECUTE FUNCTION public.on_first_scan_notify_admin();
