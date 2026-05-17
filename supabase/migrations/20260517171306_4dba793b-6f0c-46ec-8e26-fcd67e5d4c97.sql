
CREATE TABLE public.public_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  url_host text NOT NULL,
  ip_hash text,
  promises jsonb NOT NULL DEFAULT '[]'::jsonb,
  clarity_score integer,
  promise_count integer NOT NULL DEFAULT 0,
  vague_count integer NOT NULL DEFAULT 0,
  clear_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_audits_ip_created ON public.public_audits (ip_hash, created_at DESC);
CREATE INDEX idx_public_audits_host ON public.public_audits (url_host);
CREATE INDEX idx_public_audits_created ON public.public_audits (created_at DESC);

ALTER TABLE public.public_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no client reads on public_audits"
  ON public.public_audits FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "no client writes on public_audits"
  ON public.public_audits FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- Aggregate stats function for social proof on the landing page.
CREATE OR REPLACE FUNCTION public.public_audit_stats()
RETURNS TABLE(total_24h bigint, total_all_time bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.public_audits WHERE created_at > now() - interval '24 hours')::bigint,
    (SELECT COUNT(*) FROM public.public_audits)::bigint;
$$;

GRANT EXECUTE ON FUNCTION public.public_audit_stats() TO anon, authenticated;
