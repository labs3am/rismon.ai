DROP POLICY IF EXISTS "anyone can insert waitlist" ON public.waitlist;

CREATE POLICY "anyone can insert valid waitlist email"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);