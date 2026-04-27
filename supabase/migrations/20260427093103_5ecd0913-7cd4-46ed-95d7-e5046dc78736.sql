-- Lock down SECURITY DEFINER functions: revoke PUBLIC/anon execute everywhere,
-- and revoke authenticated from functions that should never be called from a client JWT.

-- 1) Revoke PUBLIC and anon execute on every SECURITY DEFINER function in public schema
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_broadcast_secret_set() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_users_without_github(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_recent_signups(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_top_scanners(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_inactive_users(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_recent_scans(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_activity_timeseries(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_plan_distribution() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_user_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_traffic_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_top_pages(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_traffic_timeseries(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_top_referrers(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_report_feedback(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_feedback_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_notify_key(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_notify_key_set() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_broadcast_secret(text) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_pro_credit(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_pro_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.app_has_backend(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_scan_ready_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_app_supabase_credentials(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_blog_admin() FROM PUBLIC, anon;

-- 2) Revoke authenticated execute on internal-only functions (triggers, helpers, server-only)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preserve_analyses_on_app_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_new_user_notify_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_first_scan_notify_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_report_feedback() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_event(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._apps_credentials_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_app_supabase_credentials(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 3) Ensure service_role retains execute on internal helpers it needs
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.preserve_analyses_on_app_delete() TO service_role;
GRANT EXECUTE ON FUNCTION public.on_new_user_notify_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.on_first_scan_notify_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_report_feedback() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_admin_event(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public._apps_credentials_key() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_app_supabase_credentials(uuid) TO service_role;