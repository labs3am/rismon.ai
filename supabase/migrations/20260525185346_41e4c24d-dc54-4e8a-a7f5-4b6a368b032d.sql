
-- Admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log (actor_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_blog_admin());

DROP POLICY IF EXISTS "No client inserts on admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "No client inserts on admin_audit_log" ON public.admin_audit_log
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates on admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "No client updates on admin_audit_log" ON public.admin_audit_log
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "No client deletes on admin_audit_log" ON public.admin_audit_log
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- Helper: write an audit entry. SECURITY DEFINER so wrapped functions can insert
-- without needing INSERT privileges on the table from the caller's role.
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _target_user_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_user_id, details)
  VALUES (auth.uid(), _email, _action, _target_user_id, _details);
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_action(text, uuid, jsonb) FROM public, anon, authenticated;

-- Wrap admin_set_user_plan
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_target_user_id uuid, _plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _plan NOT IN ('free', 'pro') THEN
    RAISE EXCEPTION 'Invalid plan: must be free or pro';
  END IF;

  IF _plan = 'pro' THEN
    UPDATE public.profiles
    SET plan = 'pro',
        pro_until = now() + interval '100 years',
        pro_credits = GREATEST(pro_credits, 0)
    WHERE id = _target_user_id;
  ELSE
    UPDATE public.profiles
    SET plan = 'free',
        pro_until = NULL,
        pro_credits = 0
    WHERE id = _target_user_id;
  END IF;

  PERFORM public.log_admin_action(
    'set_user_plan',
    _target_user_id,
    jsonb_build_object('plan', _plan)
  );
END;
$$;

-- Wrap admin_delete_user
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_email text;
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account from this panel';
  END IF;

  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;

  PERFORM public.log_admin_action(
    'delete_user',
    _target_user_id,
    jsonb_build_object('email', _target_email)
  );

  DELETE FROM auth.users WHERE id = _target_user_id;
END;
$$;

-- Wrap admin_set_broadcast_secret
CREATE OR REPLACE FUNCTION public.admin_set_broadcast_secret(_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _default_url text;
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _secret IS NULL OR length(_secret) < 16 THEN
    RAISE EXCEPTION 'Secret must be at least 16 characters';
  END IF;

  UPDATE public.admin_notify_settings
  SET broadcast_secret = _secret
  WHERE id = 1;

  IF NOT FOUND THEN
    _default_url := COALESCE(current_setting('app.settings.supabase_url', true), '');
    IF _default_url = '' THEN
      RAISE EXCEPTION 'admin_notify_settings row missing and no default URL available; please insert the row with function_url first';
    END IF;
    INSERT INTO public.admin_notify_settings (id, function_url, broadcast_secret)
    VALUES (1, _default_url || '/functions/v1/admin-notify', _secret);
  END IF;

  PERFORM public.log_admin_action('set_broadcast_secret', NULL, jsonb_build_object('secret_length', length(_secret)));
END;
$$;

-- Wrap admin_set_notify_key (currently no-op but still worth logging if called)
CREATE OR REPLACE FUNCTION public.admin_set_notify_key(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  PERFORM public.log_admin_action('set_notify_key_called', NULL, NULL);
  RETURN;
END;
$$;

-- Read helper for the admin UI
CREATE OR REPLACE FUNCTION public.admin_recent_audit_log(_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  actor_email text,
  action text,
  target_user_id uuid,
  details jsonb
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
  SELECT l.id, l.created_at, l.actor_email, l.action, l.target_user_id, l.details
  FROM public.admin_audit_log l
  ORDER BY l.created_at DESC
  LIMIT _limit;
END;
$$;
