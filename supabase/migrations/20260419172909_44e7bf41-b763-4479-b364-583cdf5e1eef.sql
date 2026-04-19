CREATE TABLE public.finding_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_id UUID,
  finding_id TEXT,
  finding_name TEXT,
  finding_category TEXT,
  reason TEXT NOT NULL,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finding_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own disputes"
ON public.finding_disputes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their own disputes"
ON public.finding_disputes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_finding_disputes_user ON public.finding_disputes(user_id);
CREATE INDEX idx_finding_disputes_analysis ON public.finding_disputes(analysis_id);