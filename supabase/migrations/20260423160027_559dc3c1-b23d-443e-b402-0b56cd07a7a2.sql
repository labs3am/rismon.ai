DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE public.profiles
  SET plan = 'free',
      pro_until = NULL,
      pro_credits = 0
  WHERE email = 'risvan@labs3am.com';
END $$;