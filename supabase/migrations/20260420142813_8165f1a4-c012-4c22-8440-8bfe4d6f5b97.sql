-- 1. Grant unlimited Pro access to risvan@labs3am.com (10 years)
UPDATE public.profiles
SET pro_until = now() + interval '10 years',
    plan = 'pro'
WHERE email = 'risvan@labs3am.com';

-- 2. Clear the 24h duplicate-scan block for labs3am/noteflow-saas
-- by marking recent completed sessions as 'archived' so checkAbuseLimits won't find them
UPDATE public.scan_sessions
SET status = 'archived'
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'risvan@labs3am.com')
  AND repo_name = 'labs3am/noteflow-saas'
  AND status = 'complete'
  AND created_at >= now() - interval '24 hours';

-- 3. Also clean up any stuck pending/analyzing sessions that would trigger the concurrent-scan lock
UPDATE public.scan_sessions
SET status = 'cancelled'
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'risvan@labs3am.com')
  AND status IN ('pending', 'analyzing')
  AND created_at < now() - interval '5 minutes';