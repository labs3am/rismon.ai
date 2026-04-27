-- scan_sessions: no client deletes
DROP POLICY IF EXISTS "No client deletes on scan_sessions" ON public.scan_sessions;
CREATE POLICY "No client deletes on scan_sessions"
ON public.scan_sessions
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- scan_reminders: no client writes
DROP POLICY IF EXISTS "No client inserts on scan_reminders" ON public.scan_reminders;
CREATE POLICY "No client inserts on scan_reminders"
ON public.scan_reminders AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on scan_reminders" ON public.scan_reminders;
CREATE POLICY "No client updates on scan_reminders"
ON public.scan_reminders AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on scan_reminders" ON public.scan_reminders;
CREATE POLICY "No client deletes on scan_reminders"
ON public.scan_reminders AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- scan_limits: no client writes
DROP POLICY IF EXISTS "No client inserts on scan_limits" ON public.scan_limits;
CREATE POLICY "No client inserts on scan_limits"
ON public.scan_limits AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on scan_limits" ON public.scan_limits;
CREATE POLICY "No client updates on scan_limits"
ON public.scan_limits AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on scan_limits" ON public.scan_limits;
CREATE POLICY "No client deletes on scan_limits"
ON public.scan_limits AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- scan_usage: no client writes
DROP POLICY IF EXISTS "No client inserts on scan_usage" ON public.scan_usage;
CREATE POLICY "No client inserts on scan_usage"
ON public.scan_usage AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on scan_usage" ON public.scan_usage;
CREATE POLICY "No client updates on scan_usage"
ON public.scan_usage AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on scan_usage" ON public.scan_usage;
CREATE POLICY "No client deletes on scan_usage"
ON public.scan_usage AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- scan_usage_monthly: no client writes
DROP POLICY IF EXISTS "No client inserts on scan_usage_monthly" ON public.scan_usage_monthly;
CREATE POLICY "No client inserts on scan_usage_monthly"
ON public.scan_usage_monthly AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on scan_usage_monthly" ON public.scan_usage_monthly;
CREATE POLICY "No client updates on scan_usage_monthly"
ON public.scan_usage_monthly AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on scan_usage_monthly" ON public.scan_usage_monthly;
CREATE POLICY "No client deletes on scan_usage_monthly"
ON public.scan_usage_monthly AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- finding_disputes: no client updates/deletes
DROP POLICY IF EXISTS "No client updates on finding_disputes" ON public.finding_disputes;
CREATE POLICY "No client updates on finding_disputes"
ON public.finding_disputes AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on finding_disputes" ON public.finding_disputes;
CREATE POLICY "No client deletes on finding_disputes"
ON public.finding_disputes AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);