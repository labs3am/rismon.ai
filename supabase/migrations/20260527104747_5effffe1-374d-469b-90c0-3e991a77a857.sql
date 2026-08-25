DROP FUNCTION IF EXISTS public.public_audit_stats();

CREATE OR REPLACE FUNCTION public.public_audit_stats()
 RETURNS TABLE(total_all_time bigint, promises_analyzed bigint, vague_claims_caught bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT COUNT(*) FROM public.public_audits)::bigint,
    (SELECT COALESCE(SUM(promise_count), 0) FROM public.public_audits)::bigint,
    (SELECT COALESCE(SUM(vague_count), 0) FROM public.public_audits)::bigint;
$function$;