CREATE POLICY "authenticated can read waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (true);