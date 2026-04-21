-- Tighten RLS policies: scope to `authenticated` role only (instead of `public`)
-- and add an explicit deny-SELECT on waitlist for clarity.

-- ============ apps ============
DROP POLICY IF EXISTS "own apps" ON public.apps;

CREATE POLICY "Users can view their own apps"
  ON public.apps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own apps"
  ON public.apps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own apps"
  ON public.apps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own apps"
  ON public.apps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============ profiles ============
DROP POLICY IF EXISTS "own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ============ analyses ============
DROP POLICY IF EXISTS "own analyses" ON public.analyses;

CREATE POLICY "Users can view their own analyses"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON public.analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON public.analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON public.analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============ scan_usage ============
DROP POLICY IF EXISTS "Users see own usage" ON public.scan_usage;

CREATE POLICY "Users can view their own scan usage"
  ON public.scan_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan usage"
  ON public.scan_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan usage"
  ON public.scan_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan usage"
  ON public.scan_usage FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============ scan_usage_monthly ============
DROP POLICY IF EXISTS "Users see own monthly usage" ON public.scan_usage_monthly;

CREATE POLICY "Users can view their own monthly scan usage"
  ON public.scan_usage_monthly FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly scan usage"
  ON public.scan_usage_monthly FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly scan usage"
  ON public.scan_usage_monthly FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly scan usage"
  ON public.scan_usage_monthly FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============ waitlist ============
-- Keep the existing INSERT-for-anyone policy (needed for the waitlist form).
-- Add explicit deny policies for SELECT/UPDATE/DELETE so intent is documented
-- and no one can ever read collected emails from the client.
CREATE POLICY "No one can read waitlist emails"
  ON public.waitlist FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "No one can update waitlist emails"
  ON public.waitlist FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No one can delete waitlist emails"
  ON public.waitlist FOR DELETE
  TO anon, authenticated
  USING (false);
