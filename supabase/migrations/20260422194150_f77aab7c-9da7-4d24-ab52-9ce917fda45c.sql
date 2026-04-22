DROP FUNCTION IF EXISTS public.admin_top_scanners(integer);

CREATE OR REPLACE FUNCTION public.admin_top_scanners(_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, email text, full_name text, scan_count bigint, last_scan_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, COUNT(a.id)::bigint, MAX(a.created_at)
  FROM public.profiles p
  LEFT JOIN public.analyses a ON a.user_id = p.id
  GROUP BY p.id, p.email, p.full_name
  HAVING COUNT(a.id) > 0
  ORDER BY COUNT(a.id) DESC
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_inactive_users(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, app_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.created_at, u.last_sign_in_at,
         (SELECT COUNT(*) FROM public.apps ap WHERE ap.user_id = p.id)::bigint
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE NOT EXISTS (SELECT 1 FROM public.analyses a WHERE a.user_id = p.id)
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_users_without_github(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, email text, full_name text, created_at timestamptz, app_count bigint, scan_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.created_at,
         (SELECT COUNT(*) FROM public.apps ap WHERE ap.user_id = p.id)::bigint,
         (SELECT COUNT(*) FROM public.analyses a WHERE a.user_id = p.id)::bigint
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.apps ap
    WHERE ap.user_id = p.id AND ap.github_repo_url IS NOT NULL AND ap.github_repo_url <> ''
  )
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_activity_timeseries(_days integer DEFAULT 30)
RETURNS TABLE(day date, signups bigint, scans bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (CURRENT_DATE - (_days - 1) * INTERVAL '1 day')::date,
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date AS d
  )
  SELECT d.d,
    (SELECT COUNT(*) FROM public.profiles p WHERE p.created_at::date = d.d)::bigint,
    (SELECT COUNT(*) FROM public.analyses a WHERE a.created_at::date = d.d)::bigint
  FROM days d
  ORDER BY d.d ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_plan_distribution()
RETURNS TABLE(plan text, user_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT
    CASE
      WHEN (p.pro_until IS NOT NULL AND p.pro_until > now()) OR p.pro_credits > 0 THEN 'pro'
      ELSE COALESCE(p.plan, 'free')
    END AS plan,
    COUNT(*)::bigint
  FROM public.profiles p
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$$;