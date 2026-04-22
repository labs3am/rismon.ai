
-- Page views table
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  session_id text,
  user_id uuid,
  viewport text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_path_idx ON public.page_views (path);
CREATE INDEX page_views_session_idx ON public.page_views (session_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anon + authenticated). No reads at all from clients.
CREATE POLICY "anyone can insert page view"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "no client reads"
  ON public.page_views FOR SELECT
  TO anon, authenticated
  USING (false);

-- ── Admin RPCs ──

CREATE OR REPLACE FUNCTION public.admin_traffic_stats()
RETURNS TABLE(
  views_today bigint,
  views_7d bigint,
  views_30d bigint,
  unique_sessions_7d bigint,
  unique_visitors_7d bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.page_views WHERE created_at::date = CURRENT_DATE)::bigint,
    (SELECT COUNT(*) FROM public.page_views WHERE created_at > now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM public.page_views WHERE created_at > now() - interval '30 days')::bigint,
    (SELECT COUNT(DISTINCT session_id) FROM public.page_views WHERE created_at > now() - interval '7 days' AND session_id IS NOT NULL)::bigint,
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id)) FROM public.page_views WHERE created_at > now() - interval '7 days')::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_top_pages(_days integer DEFAULT 7, _limit integer DEFAULT 20)
RETURNS TABLE(path text, views bigint, unique_sessions bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT
    pv.path,
    COUNT(*)::bigint AS views,
    COUNT(DISTINCT pv.session_id)::bigint AS unique_sessions
  FROM public.page_views pv
  WHERE pv.created_at > now() - (_days || ' days')::interval
  GROUP BY pv.path
  ORDER BY COUNT(*) DESC
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_traffic_timeseries(_days integer DEFAULT 30)
RETURNS TABLE(day date, views bigint, unique_sessions bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  SELECT
    d.d,
    (SELECT COUNT(*) FROM public.page_views pv WHERE pv.created_at::date = d.d)::bigint,
    (SELECT COUNT(DISTINCT pv.session_id) FROM public.page_views pv WHERE pv.created_at::date = d.d)::bigint
  FROM days d
  ORDER BY d.d ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_top_referrers(_days integer DEFAULT 7, _limit integer DEFAULT 15)
RETURNS TABLE(referrer text, views bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(pv.referrer, ''), '(direct)') AS referrer,
    COUNT(*)::bigint AS views
  FROM public.page_views pv
  WHERE pv.created_at > now() - (_days || ' days')::interval
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT _limit;
END;
$$;
