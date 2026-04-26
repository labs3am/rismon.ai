-- Lock down user-facing SECURITY DEFINER helpers so anon cannot call them.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'app_has_backend(uuid)',
    'claim_scan_ready_email(text)',
    'consume_pro_credit(uuid)',
    'delete_my_account()',
    'get_user_plan(uuid)',
    'has_pro_access(uuid)',
    'is_blog_admin()',
    'notify_admin_event(text, jsonb)'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function %', fn;
    END;
  END LOOP;
END$$;

-- notify_admin_event is called from triggers (which run as the table owner /
-- definer), so granting EXECUTE to authenticated only is fine here — the
-- trigger contexts already have privileges via SECURITY DEFINER chain.

-- Trigger-only functions intentionally remain accessible to PUBLIC because
-- Postgres invokes them automatically; revoking would break inserts.
-- These include: handle_new_user, rls_auto_enable, on_new_user_notify_admin,
-- on_first_scan_notify_admin, preserve_analyses_on_app_delete,
-- prevent_profile_privilege_escalation.