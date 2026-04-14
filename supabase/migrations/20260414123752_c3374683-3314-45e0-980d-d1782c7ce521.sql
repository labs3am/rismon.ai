
-- Restrict scan_limits RLS: remove ALL policy, add SELECT and INSERT only
DROP POLICY IF EXISTS "own limits" ON public.scan_limits;

CREATE POLICY "own_limits_select" ON public.scan_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own_limits_insert" ON public.scan_limits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
