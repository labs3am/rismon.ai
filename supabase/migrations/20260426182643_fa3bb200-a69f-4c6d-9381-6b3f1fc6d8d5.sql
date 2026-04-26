ALTER TABLE public.scan_sessions
ADD COLUMN IF NOT EXISTS scan_ready_email_sent_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION public.claim_scan_ready_email(_report_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  UPDATE public.scan_sessions
  SET scan_ready_email_sent_at = now()
  WHERE report_id = _report_id
    AND user_id = auth.uid()
    AND status = 'complete'
    AND scan_ready_email_sent_at IS NULL;

  GET DIAGNOSTICS claimed = ROW_COUNT;
  RETURN claimed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_scan_ready_email(text) TO authenticated;