-- Add foreign key constraints with CASCADE for all user-linked tables

-- profiles.id -> auth.users.id
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- apps.user_id -> auth.users.id
ALTER TABLE public.apps
DROP CONSTRAINT IF EXISTS apps_user_id_fkey;
ALTER TABLE public.apps
ADD CONSTRAINT apps_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- analyses.user_id -> auth.users.id
ALTER TABLE public.analyses
DROP CONSTRAINT IF EXISTS analyses_user_id_fkey;
ALTER TABLE public.analyses
ADD CONSTRAINT analyses_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- scan_limits.user_id -> auth.users.id
ALTER TABLE public.scan_limits
DROP CONSTRAINT IF EXISTS scan_limits_user_id_fkey;
ALTER TABLE public.scan_limits
ADD CONSTRAINT scan_limits_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create delete_my_account function
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to delete your account.';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;