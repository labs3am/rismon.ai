-- 1) Revoke column-level SELECT on sensitive credential columns from client roles.
-- These columns are only needed server-side (analyze edge function via service role).
REVOKE SELECT (supabase_url, supabase_anon_key) ON public.apps FROM authenticated, anon;

-- We still allow INSERT/UPDATE of these columns from the owner via RLS (so users
-- can save their credentials from the Connect page). INSERT/UPDATE column grants
-- are the default; we only restrict SELECT here.

-- 2) Add explicit restrictive policies on payments so INSERT/UPDATE/DELETE are
-- impossible from client roles regardless of future permissive policy drift.
-- Payment rows are managed exclusively by server-side code using the service role,
-- which bypasses RLS.
DROP POLICY IF EXISTS "No client inserts on payments" ON public.payments;
CREATE POLICY "No client inserts on payments"
  ON public.payments
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates on payments" ON public.payments;
CREATE POLICY "No client updates on payments"
  ON public.payments
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on payments" ON public.payments;
CREATE POLICY "No client deletes on payments"
  ON public.payments
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated, anon
  USING (false);