-- Restore SELECT on non-sensitive GitHub fields (public repo metadata, needed by dashboard UI)
GRANT SELECT (github_repo_url, github_owner, github_repo_name)
  ON public.apps TO authenticated;