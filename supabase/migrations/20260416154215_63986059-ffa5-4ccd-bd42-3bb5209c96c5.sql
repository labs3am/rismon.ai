
CREATE TABLE public.scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repo_name text,
  project_type text,
  payment_type text,
  concern_text text,
  status text NOT NULL DEFAULT 'pending',
  report_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan sessions"
ON public.scan_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scan sessions"
ON public.scan_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan sessions"
ON public.scan_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
