
-- 1) Remove service_role_key from admin_notify_settings; update notify function and helpers
ALTER TABLE public.admin_notify_settings DROP COLUMN IF EXISTS service_role_key;

CREATE OR REPLACE FUNCTION public.notify_admin_event(_event text, _payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text;
BEGIN
  SELECT function_url INTO _url
  FROM public.admin_notify_settings WHERE id = 1;

  IF _url IS NULL OR _url = '' THEN
    RETURN; -- not configured yet, fail silent
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('event', _event, 'data', _payload)
  );
EXCEPTION WHEN OTHERS THEN
  -- never break the originating insert
  NULL;
END;
$function$;

-- Keep helper RPCs functional but no-op the key setter / status checker
CREATE OR REPLACE FUNCTION public.admin_notify_key_set()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  -- service role key is no longer stored in DB; configuration is considered set
  -- when a function_url has been recorded.
  RETURN EXISTS (SELECT 1 FROM public.admin_notify_settings WHERE id = 1 AND function_url IS NOT NULL AND function_url <> '');
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_notify_key(_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  -- No-op: service role keys are no longer stored in the database.
  RETURN;
END;
$function$;

-- 2) Prevent privilege escalation via profile UPDATE
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service role / superuser updates (server-side functions) to bypass.
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.pro_until IS DISTINCT FROM OLD.pro_until
     OR NEW.pro_credits IS DISTINCT FROM OLD.pro_credits
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields (plan, pro_until, pro_credits, stripe_customer_id) from client.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3) Tighten page_views insert policy: replace WITH CHECK (true) with a basic shape check
DROP POLICY IF EXISTS "anyone can insert page view" ON public.page_views;
CREATE POLICY "anyone can insert page view"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  path IS NOT NULL
  AND length(path) > 0
  AND length(path) <= 2048
  AND (user_id IS NULL OR user_id = auth.uid())
);
