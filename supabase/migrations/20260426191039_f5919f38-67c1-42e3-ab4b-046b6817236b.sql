CREATE OR REPLACE FUNCTION public.admin_set_broadcast_secret(_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Update existing row if present.
  UPDATE public.admin_notify_settings
  SET broadcast_secret = _secret
  WHERE id = 1;

  IF NOT FOUND THEN
    -- Build a sensible default function_url from the project URL.
    _default_url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      ''
    );
    IF _default_url = '' THEN
      RAISE EXCEPTION 'admin_notify_settings row missing and no default URL available; please insert the row with function_url first';
    END IF;
    INSERT INTO public.admin_notify_settings (id, function_url, broadcast_secret)
    VALUES (1, _default_url || '/functions/v1/admin-notify', _secret);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_broadcast_secret(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_broadcast_secret(text) TO authenticated;