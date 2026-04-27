-- 1) Attach prevent_profile_privilege_escalation trigger to profiles
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Make analyses.user_id NOT NULL and tighten INSERT WITH CHECK
-- First, clean up any orphan rows (set to a sentinel? no — delete is unsafe; only enforce going forward)
-- Drop the old policy and recreate with explicit NOT NULL check
DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.analyses;
CREATE POLICY "Users can insert their own analyses"
ON public.analyses
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

-- Add NOT NULL constraint going forward (use validation trigger to avoid blocking historical NULLs)
CREATE OR REPLACE FUNCTION public.enforce_analyses_user_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'analyses.user_id cannot be null';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_analyses_user_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_analyses_user_id() TO service_role;

DROP TRIGGER IF EXISTS enforce_analyses_user_id_trg ON public.analyses;
CREATE TRIGGER enforce_analyses_user_id_trg
BEFORE INSERT OR UPDATE ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_analyses_user_id();

-- 3) finding_disputes: prevent email spoofing
DROP POLICY IF EXISTS "Users can create their own disputes" ON public.finding_disputes;
CREATE POLICY "Users can create their own disputes"
ON public.finding_disputes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    user_email IS NULL
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 4) Attach validate_report_feedback trigger
DROP TRIGGER IF EXISTS validate_report_feedback_trg ON public.report_feedback;
CREATE TRIGGER validate_report_feedback_trg
BEFORE INSERT OR UPDATE ON public.report_feedback
FOR EACH ROW
EXECUTE FUNCTION public.validate_report_feedback();

-- 5) Attach touch_updated_at to tables that have updated_at
DROP TRIGGER IF EXISTS touch_updated_at_blog_posts ON public.blog_posts;
CREATE TRIGGER touch_updated_at_blog_posts
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_updated_at_payments ON public.payments;
CREATE TRIGGER touch_updated_at_payments
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_updated_at_report_reviews ON public.report_reviews;
CREATE TRIGGER touch_updated_at_report_reviews
BEFORE UPDATE ON public.report_reviews
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- 6) Attach preserve_analyses_on_app_delete to apps
DROP TRIGGER IF EXISTS preserve_analyses_on_app_delete_trg ON public.apps;
CREATE TRIGGER preserve_analyses_on_app_delete_trg
BEFORE DELETE ON public.apps
FOR EACH ROW
EXECUTE FUNCTION public.preserve_analyses_on_app_delete();

-- 7) Attach handle_new_user to auth.users for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 8) Attach admin notification triggers
DROP TRIGGER IF EXISTS on_new_user_notify_admin_trg ON public.profiles;
CREATE TRIGGER on_new_user_notify_admin_trg
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.on_new_user_notify_admin();

DROP TRIGGER IF EXISTS on_first_scan_notify_admin_trg ON public.analyses;
CREATE TRIGGER on_first_scan_notify_admin_trg
AFTER INSERT OR UPDATE OF status ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.on_first_scan_notify_admin();