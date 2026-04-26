-- Revoke anon SELECT on all public tables except blog_posts.
-- This hides them from pg_graphql introspection while preserving
-- intentional anon INSERT access (waitlist, page_views) and all
-- authenticated user access (governed by RLS).

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'blog_posts'
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t.tablename);
  END LOOP;
END $$;

-- Also revoke on any views in public (except none we want public).
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', v.viewname);
  END LOOP;
END $$;

-- Ensure blog_posts remains readable by anon (for published posts via RLS).
GRANT SELECT ON public.blog_posts TO anon;