ALTER TABLE public.public_audits ADD COLUMN IF NOT EXISTS reality_checks jsonb;
ALTER TABLE public.public_audits ADD COLUMN IF NOT EXISTS backed_count integer;
ALTER TABLE public.public_audits ADD COLUMN IF NOT EXISTS reality_score integer;

DROP FUNCTION IF EXISTS public.get_public_audit(uuid);

CREATE FUNCTION public.get_public_audit(_id uuid)
RETURNS TABLE (
  id uuid,
  url text,
  url_host text,
  title text,
  promises jsonb,
  reality_checks jsonb,
  clarity_score integer,
  reality_score integer,
  promise_count integer,
  clear_count integer,
  vague_count integer,
  backed_count integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, url, url_host, title, promises, reality_checks, clarity_score, reality_score,
         promise_count, clear_count, vague_count, backed_count, created_at
  FROM public.public_audits
  WHERE id = _id
  LIMIT 1
$$;