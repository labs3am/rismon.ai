ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS scan_type text,
  ADD COLUMN IF NOT EXISTS files_scanned integer,
  ADD COLUMN IF NOT EXISTS scan_duration_seconds integer;