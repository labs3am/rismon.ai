-- Add live URL to apps so we can scan the deployed homepage for promises
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS live_url text,
  ADD COLUMN IF NOT EXISTS app_description text;

-- Store the new finding categories on analyses
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS legal_findings jsonb,
  ADD COLUMN IF NOT EXISTS landing_page_promises jsonb,
  ADD COLUMN IF NOT EXISTS homepage_signals jsonb,
  ADD COLUMN IF NOT EXISTS security_score integer;