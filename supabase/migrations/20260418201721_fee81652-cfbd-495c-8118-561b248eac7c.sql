-- Mark stale 'reading' analyses (no files_scanned, no summary) as failed
UPDATE public.analyses
SET status = 'failed'
WHERE status = 'reading'
  AND files_scanned IS NULL
  AND summary IS NULL
  AND created_at < now() - interval '10 minutes';

-- Also delete those failed empty stubs so they don't pollute the dashboard
DELETE FROM public.analyses
WHERE status = 'failed'
  AND files_scanned IS NULL
  AND summary IS NULL;

-- Mark any remaining stuck sessions as cancelled
UPDATE public.scan_sessions
SET status = 'cancelled'
WHERE status IN ('pending', 'analyzing')
  AND created_at < now() - interval '10 minutes';