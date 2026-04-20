-- Add deep_scan_credits to profiles for try_pro plan tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deep_scan_credits integer NOT NULL DEFAULT 3;

-- Add scan_type to analyses to record whether it was a quick or deep scan
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS scan_type text NOT NULL DEFAULT 'quick';

-- Add new Claude response fields to analyses
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS grade text;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS launch_status text;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS next_step text;
