-- Revoke SELECT from anon on every public table that does not need to be
-- discoverable by anonymous visitors. blog_posts is the only public-facing
-- read surface and is intentionally excluded.
--
-- Notes:
-- - Existing INSERT grants for anon are preserved (waitlist, page_views).
-- - Authenticated users keep their SELECT grant; their access is governed
--   by the existing RLS policies.
-- - pg_graphql derives introspection visibility from the privilege grants,
--   so revoking SELECT from anon hides each table from the public
--   /graphql/v1 schema.

REVOKE SELECT ON public.admin_notify_settings FROM anon;
REVOKE SELECT ON public.analyses             FROM anon;
REVOKE SELECT ON public.apps                 FROM anon;
REVOKE SELECT ON public.finding_disputes     FROM anon;
REVOKE SELECT ON public.monitored_repos      FROM anon;
REVOKE SELECT ON public.page_views           FROM anon;
REVOKE SELECT ON public.payments             FROM anon;
REVOKE SELECT ON public.profiles             FROM anon;
REVOKE SELECT ON public.report_feedback      FROM anon;
REVOKE SELECT ON public.report_reviews       FROM anon;
REVOKE SELECT ON public.scan_limits          FROM anon;
REVOKE SELECT ON public.scan_reminders       FROM anon;
REVOKE SELECT ON public.scan_sessions        FROM anon;
REVOKE SELECT ON public.scan_usage           FROM anon;
REVOKE SELECT ON public.scan_usage_monthly   FROM anon;
REVOKE SELECT ON public.waitlist             FROM anon;