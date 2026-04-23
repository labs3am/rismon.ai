CREATE OR REPLACE FUNCTION public.delete_my_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to delete your account.';
  END IF;

  -- Cancel any in-flight scan sessions so background jobs don't keep
  -- writing to a user that no longer exists.
  UPDATE public.scan_sessions
  SET status = 'cancelled'
  WHERE user_id = _uid AND status IN ('pending', 'analyzing');

  -- Remove ancillary records that don't have FK cascades to auth.users.
  DELETE FROM public.scan_sessions WHERE user_id = _uid;
  DELETE FROM public.analyses WHERE user_id = _uid;
  DELETE FROM public.apps WHERE user_id = _uid;

  DELETE FROM auth.users WHERE id = _uid;
END;
$function$;