-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "authenticated can read waitlist" ON public.waitlist;

-- Add email format validation
ALTER TABLE public.waitlist ADD CONSTRAINT valid_email
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add unique constraint on email (may already exist, use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_email_unique'
  ) THEN
    ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_email_unique UNIQUE (email);
  END IF;
END $$;