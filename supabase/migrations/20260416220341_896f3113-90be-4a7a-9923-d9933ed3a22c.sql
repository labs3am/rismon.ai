-- 1. Profiles: add Pro tracking columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  stripe_subscription_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('one_time', 'monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- (No insert/update policy — only edge functions with service role can write)

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON public.payments(stripe_session_id);

-- 3. Monitored repos (continuous monitoring for Pro)
CREATE TABLE IF NOT EXISTS public.monitored_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  app_id UUID NOT NULL,
  webhook_secret TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id)
);

ALTER TABLE public.monitored_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monitored repos"
  ON public.monitored_repos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_monitored_repos_user ON public.monitored_repos(user_id);

-- 4. Scan reminders (prevent duplicate weekly emails)
CREATE TABLE IF NOT EXISTS public.scan_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'weekly_inactive',
  week_start DATE NOT NULL DEFAULT (date_trunc('week', now()))::date,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reminder_type, week_start)
);

ALTER TABLE public.scan_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reminders"
  ON public.scan_reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Helper function: check if user has Pro access (subscription OR credits)
CREATE OR REPLACE FUNCTION public.has_pro_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND (
        (pro_until IS NOT NULL AND pro_until > now())
        OR pro_credits > 0
      )
  );
$$;

-- 6. Helper function: consume one Pro credit (atomic)
CREATE OR REPLACE FUNCTION public.consume_pro_credit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_subscription BOOLEAN;
  _credits INTEGER;
BEGIN
  -- If user has active subscription, no credit needed
  SELECT (pro_until IS NOT NULL AND pro_until > now()), pro_credits
  INTO _has_subscription, _credits
  FROM public.profiles WHERE id = _user_id;

  IF _has_subscription THEN
    RETURN TRUE;
  END IF;

  IF _credits > 0 THEN
    UPDATE public.profiles
    SET pro_credits = pro_credits - 1
    WHERE id = _user_id AND pro_credits > 0;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 7. Trigger to update updated_at on payments
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_touch_updated_at ON public.payments;
CREATE TRIGGER payments_touch_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();