ALTER TABLE public.public_audits ADD COLUMN IF NOT EXISTS title text;

DROP FUNCTION IF EXISTS public.get_public_audit(uuid);

CREATE OR REPLACE FUNCTION public.get_public_audit(_id uuid)
 RETURNS TABLE(id uuid, url text, url_host text, title text, promises jsonb, clarity_score integer, promise_count integer, clear_count integer, vague_count integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, url, url_host, title, promises, clarity_score, promise_count, clear_count, vague_count, created_at
  FROM public.public_audits
  WHERE id = _id
  LIMIT 1;
$function$;