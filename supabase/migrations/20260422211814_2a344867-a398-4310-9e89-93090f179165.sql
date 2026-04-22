
CREATE TABLE public.report_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, user_id)
);

CREATE INDEX report_feedback_created_at_idx ON public.report_feedback (created_at DESC);
CREATE INDEX report_feedback_analysis_idx ON public.report_feedback (analysis_id);

-- Validation trigger: rating 1..5, comment <= 2000 chars
CREATE OR REPLACE FUNCTION public.validate_report_feedback()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF NEW.comment IS NOT NULL AND length(NEW.comment) > 2000 THEN
    RAISE EXCEPTION 'comment too long (max 2000 chars)';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER report_feedback_validate
  BEFORE INSERT OR UPDATE ON public.report_feedback
  FOR EACH ROW EXECUTE FUNCTION public.validate_report_feedback();

ALTER TABLE public.report_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own feedback"
  ON public.report_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all feedback"
  ON public.report_feedback FOR SELECT
  TO authenticated
  USING (is_blog_admin());

CREATE POLICY "Users insert own feedback"
  ON public.report_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own feedback"
  ON public.report_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin RPC for the reviews page (joins email + analysis info)
CREATE OR REPLACE FUNCTION public.admin_list_report_feedback(_limit integer DEFAULT 200)
RETURNS TABLE(
  id uuid,
  analysis_id uuid,
  user_id uuid,
  user_email text,
  rating smallint,
  comment text,
  scan_type text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT
    f.id,
    f.analysis_id,
    f.user_id,
    p.email,
    f.rating,
    f.comment,
    a.scan_type,
    f.created_at,
    f.updated_at
  FROM public.report_feedback f
  LEFT JOIN public.profiles p ON p.id = f.user_id
  LEFT JOIN public.analyses a ON a.id = f.analysis_id
  ORDER BY f.created_at DESC
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_feedback_stats()
RETURNS TABLE(
  total bigint,
  avg_rating numeric,
  five_star bigint,
  four_star bigint,
  three_star bigint,
  two_star bigint,
  one_star bigint,
  with_comments bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_blog_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*) FILTER (WHERE rating = 5)::bigint,
    COUNT(*) FILTER (WHERE rating = 4)::bigint,
    COUNT(*) FILTER (WHERE rating = 3)::bigint,
    COUNT(*) FILTER (WHERE rating = 2)::bigint,
    COUNT(*) FILTER (WHERE rating = 1)::bigint,
    COUNT(*) FILTER (WHERE comment IS NOT NULL AND length(trim(comment)) > 0)::bigint
  FROM public.report_feedback;
END;
$$;
