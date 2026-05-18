
-- Public RPC to fetch a single audit by id (for shareable permalinks)
CREATE OR REPLACE FUNCTION public.get_public_audit(_id uuid)
RETURNS TABLE(
  id uuid,
  url text,
  url_host text,
  promises jsonb,
  clarity_score integer,
  promise_count integer,
  clear_count integer,
  vague_count integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, url, url_host, promises, clarity_score, promise_count, clear_count, vague_count, created_at
  FROM public.public_audits
  WHERE id = _id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_audit(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_audit_stats() TO anon, authenticated;
