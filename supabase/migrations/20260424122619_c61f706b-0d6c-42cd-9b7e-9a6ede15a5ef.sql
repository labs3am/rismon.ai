
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_target_user_id uuid, _plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
END;
$$;
