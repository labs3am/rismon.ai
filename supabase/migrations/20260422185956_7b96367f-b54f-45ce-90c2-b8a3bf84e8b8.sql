CREATE OR REPLACE FUNCTION public.admin_notify_key_set()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _len integer;
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT length(service_role_key) INTO _len FROM public.admin_notify_settings WHERE id = 1;
  RETURN COALESCE(_len, 0) > 20;
END;
$$;