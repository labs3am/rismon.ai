
-- Revoke from broad roles, then grant only to authenticated.
-- The function's internal is_blog_admin() check still rejects non-admin authenticated users.
REVOKE ALL ON FUNCTION public.admin_set_user_plan(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_notify_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_notify_key(text) TO authenticated;
