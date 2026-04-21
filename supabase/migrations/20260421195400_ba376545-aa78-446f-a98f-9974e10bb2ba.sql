-- Lock down scan usage / limit tables: only the service role (server-side) can write.
-- Authenticated users keep read-only access to their own rows.

-- scan_usage
DROP POLICY IF EXISTS "Users can insert their own scan usage" ON public.scan_usage;
DROP POLICY IF EXISTS "Users can update their own scan usage" ON public.scan_usage;
DROP POLICY IF EXISTS "Users can delete their own scan usage" ON public.scan_usage;

-- scan_usage_monthly
DROP POLICY IF EXISTS "Users can insert their own monthly scan usage" ON public.scan_usage_monthly;
DROP POLICY IF EXISTS "Users can update their own monthly scan usage" ON public.scan_usage_monthly;
DROP POLICY IF EXISTS "Users can delete their own monthly scan usage" ON public.scan_usage_monthly;

-- scan_limits
DROP POLICY IF EXISTS "own_limits_insert" ON public.scan_limits;
-- (no user update/delete policies exist on scan_limits)

-- Defense-in-depth: prevent app deletion from cascading away scan history.
-- analyses.app_id has no FK in schema, so deleting an app does not delete analyses.
-- We add an explicit no-op safeguard: when an app row is deleted, we null out app_id
-- on related analyses instead of letting any future cascade wipe scan history.
CREATE OR REPLACE FUNCTION public.preserve_analyses_on_app_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.analyses
  SET app_id = NULL
  WHERE app_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS preserve_analyses_before_app_delete ON public.apps;
CREATE TRIGGER preserve_analyses_before_app_delete
BEFORE DELETE ON public.apps
FOR EACH ROW
EXECUTE FUNCTION public.preserve_analyses_on_app_delete();