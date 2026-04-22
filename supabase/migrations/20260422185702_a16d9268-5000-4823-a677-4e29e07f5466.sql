
-- Use Supabase Vault to retrieve the service role key (which is auto-managed)
-- and have the trigger helper read directly from the project's auth context.

-- Simpler approach: rewrite notify_admin_event to use the vault-stored key.
-- We use the supabase_functions schema's HTTP helpers when available,
-- but pg_net works fine if we have the key. The cleanest way is to store
-- the key once via vault.create_secret. If vault isn't available, we'll
-- expose a one-time admin setter.

-- Create an admin-only setter so you can paste the service role key from
-- the Lovable Cloud dashboard if needed (but normally we'll set it from vault).

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
  UPDATE public.admin_notify_settings SET service_role_key = _key WHERE id = 1;
END;
$$;

-- Try to auto-populate from vault if a secret named 'service_role_key' or 'SUPABASE_SERVICE_ROLE_KEY' exists
DO $$
DECLARE
  _key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'admin_notify_service_key')
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL;
  END;

  IF _key IS NOT NULL THEN
    UPDATE public.admin_notify_settings SET service_role_key = _key WHERE id = 1;
  END IF;
END $$;
