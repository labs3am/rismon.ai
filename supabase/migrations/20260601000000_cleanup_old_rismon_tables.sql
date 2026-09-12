-- Cleanup: Drop tables and functions from old Rismon product
-- This migration removes all tables and functions that were used by the old
-- AI scanning/analysis product which has been completely removed.

-- Drop old tables (in order to respect foreign key constraints)
DROP TABLE IF EXISTS IF EXISTS public.finding_disputes CASCADE;
DROP TABLE IF EXISTS public.public_audits CASCADE;
DROP TABLE IF EXISTS public.scan_sessions CASCADE;
DROP TABLE IF EXISTS public.scan_usage CASCADE;
DROP TABLE IF EXISTS public.scan_usage_monthly CASCADE;
DROP TABLE IF EXISTS public.analyses CASCADE;
DROP TABLE IF EXISTS public.waitlist CASCADE;

-- Drop old functions that were specific to the scanning product
DROP FUNCTION IF EXISTS public.check_abuse_limits() CASCADE;
DROP FUNCTION IF EXISTS public.claim_scan_ready_email(_report_id text) CASCADE;
DROP FUNCTION IF EXISTS public.delete_my_account() CASCADE;
DROP FUNCTION IF EXISTS public.get_public_audit(_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.public_audit_stats() CASCADE;
DROP FUNCTION IF EXISTS public.rismon_security_metadata() CASCADE;

-- Drop triggers that were specific to the scanning product
DROP TRIGGER IF EXISTS trg_on_first_scan_notify_admin ON public.analyses;
DROP FUNCTION IF EXISTS public.on_first_scan_notify_admin() CASCADE;

-- Note: We keep the following tables as they are used by the new product:
-- - profiles (user management)
-- - apps (will be repurposed as repositories)
-- - admin_audit_log (audit logging)
-- - admin_notify_settings (notification settings)
-- - blog_posts (blog content)
-- - page_views (analytics)
-- - reviews (user reviews)

-- Note: We keep the following functions as they are used by the new product:
-- - is_blog_admin() (admin authorization)
-- - admin_list_users() (admin user listing)
-- - admin_user_stats() (admin statistics)
-- - admin_top_scanners() (admin user stats)
-- - admin_recent_signups() (admin user stats)
-- - admin_inactive_users() (admin user stats)
-- - admin_no_github_users() (admin user stats)
-- - admin_traffic_stats() (admin analytics)
-- - admin_top_pages() (admin analytics)
-- - admin_top_referrers() (admin analytics)
-- - notify_admin_event() (admin notifications)
-- - on_new_user_notify_admin() (admin notifications)
-- - prevent_profile_privilege_escalation() (security)