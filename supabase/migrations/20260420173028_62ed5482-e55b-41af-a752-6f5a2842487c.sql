
CREATE TABLE public.report_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL,
  user_id UUID NOT NULL,
  finding_id TEXT NOT NULL,
  finding_category TEXT,
  finding_name TEXT,
  finding_severity TEXT,
  verdict TEXT NOT NULL CHECK (verdict IN ('accurate', 'wrong', 'unclear')),
  comment TEXT CHECK (comment IS NULL OR length(comment) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, analysis_id, finding_id)
);

CREATE INDEX idx_report_reviews_analysis ON public.report_reviews(analysis_id);
CREATE INDEX idx_report_reviews_user ON public.report_reviews(user_id);
CREATE INDEX idx_report_reviews_verdict ON public.report_reviews(verdict);

ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reviews"
  ON public.report_reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reviews"
  ON public.report_reviews FOR SELECT TO authenticated
  USING (public.is_blog_admin());

CREATE POLICY "Users can insert their own reviews"
  ON public.report_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.report_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER report_reviews_touch_updated_at
  BEFORE UPDATE ON public.report_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
