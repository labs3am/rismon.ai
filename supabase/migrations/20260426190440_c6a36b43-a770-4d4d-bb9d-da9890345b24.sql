-- 1) Add WITH CHECK to scan_sessions UPDATE policy.
DROP POLICY IF EXISTS "Users can update their own scan sessions" ON public.scan_sessions;
CREATE POLICY "Users can update their own scan sessions"
ON public.scan_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Restrict admin SECURITY DEFINER functions to authenticated callers.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'admin_top_scanners(integer)',
    'admin_inactive_users(integer)',
    'admin_users_without_github(integer)',
    'admin_activity_timeseries(integer)',
    'admin_plan_distribution()',
    'admin_list_users()',
    'admin_user_stats()',
    'admin_recent_signups(integer)',
    'admin_recent_scans(integer)',
    'admin_delete_user(uuid)',
    'admin_set_user_plan(uuid, text)',
    'admin_traffic_stats()',
    'admin_top_pages(integer, integer)',
    'admin_traffic_timeseries(integer)',
    'admin_top_referrers(integer, integer)',
    'admin_list_report_feedback(integer)',
    'admin_feedback_stats()',
    'admin_set_notify_key(text)',
    'admin_notify_key_set()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function %', fn;
    END;
  END LOOP;
END$$;

-- 3) Store the broadcast secret in admin_notify_settings and forward it
--    to the admin-notify edge function.
ALTER TABLE public.admin_notify_settings
  ADD COLUMN IF NOT EXISTS broadcast_secret text;

CREATE OR REPLACE FUNCTION public.notify_admin_event(_event text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text;
  _secret text;
  _headers jsonb;
BEGIN
  SELECT function_url, broadcast_secret INTO _url, _secret
  FROM public.admin_notify_settings WHERE id = 1;

  IF _url IS NULL OR _url = '' THEN
    RETURN;
  END IF;

  _headers := jsonb_build_object('Content-Type', 'application/json');
  IF _secret IS NOT NULL AND _secret <> '' THEN
    _headers := _headers || jsonb_build_object('x-broadcast-secret', _secret);
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := _headers,
    body := jsonb_build_object('event', _event, 'data', _payload)
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$function$;

-- 4) Admin RPC to set/rotate the broadcast secret from the admin UI.
CREATE OR REPLACE FUNCTION public.admin_set_broadcast_secret(_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _secret IS NULL OR length(_secret) < 16 THEN
    RAISE EXCEPTION 'Secret must be at least 16 characters';
  END IF;
  INSERT INTO public.admin_notify_settings (id, broadcast_secret)
  VALUES (1, _secret)
  ON CONFLICT (id) DO UPDATE SET broadcast_secret = EXCLUDED.broadcast_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_broadcast_secret(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_broadcast_secret(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_broadcast_secret_set()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_notify_settings
    WHERE id = 1 AND broadcast_secret IS NOT NULL AND broadcast_secret <> ''
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_broadcast_secret_set() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_secret_set() TO authenticated;