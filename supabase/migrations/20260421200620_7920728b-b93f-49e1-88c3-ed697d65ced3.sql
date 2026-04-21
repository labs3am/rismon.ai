-- Restrict client-side reads of sensitive columns on apps
REVOKE SELECT (supabase_url, supabase_anon_key, github_repo_url, github_owner, github_repo_name)
  ON public.apps FROM authenticated, anon;

-- Restrict client-side reads of sensitive columns on profiles
REVOKE SELECT (stripe_customer_id)
  ON public.profiles FROM authenticated, anon;

-- Safe helper so the UI can check backend presence without reading credentials
CREATE OR REPLACE FUNCTION public.app_has_backend(_app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.apps
    WHERE id = _app_id
      AND user_id = auth.uid()
      AND supabase_url IS NOT NULL
      AND supabase_anon_key IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.app_has_backend(uuid) TO authenticated;