-- =========================================================================
-- 1. Make sure pgcrypto + vault are available (they already are; this is safe).
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =========================================================================
-- 2. Store a random encryption key in Supabase Vault (idempotent).
--    Vault encrypts the secret with the project's root key, so the value
--    is never stored in plaintext on disk.
-- =========================================================================
DO $$
DECLARE
  _existing uuid;
BEGIN
  SELECT id INTO _existing FROM vault.secrets WHERE name = 'apps_credentials_key';
  IF _existing IS NULL THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'apps_credentials_key',
      'Symmetric key used to encrypt user-supplied Supabase credentials on public.apps'
    );
  END IF;
END $$;

-- =========================================================================
-- 3. Internal helper — fetch the decrypted key from Vault.
--    SECURITY DEFINER + locked down so only our other SECURITY DEFINER
--    functions can use it. Never granted to authenticated/anon.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._apps_credentials_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'apps_credentials_key'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._apps_credentials_key() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 4. Add encrypted columns alongside the existing plaintext ones.
-- =========================================================================
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS supabase_url_enc bytea,
  ADD COLUMN IF NOT EXISTS supabase_anon_key_enc bytea;

-- =========================================================================
-- 5. Backfill: encrypt any existing plaintext values into the new columns.
-- =========================================================================
DO $$
DECLARE
  _key text := public._apps_credentials_key();
BEGIN
  UPDATE public.apps
  SET
    supabase_url_enc = CASE
      WHEN supabase_url IS NOT NULL AND supabase_url <> ''
        THEN extensions.pgp_sym_encrypt(supabase_url, _key)
      ELSE NULL
    END,
    supabase_anon_key_enc = CASE
      WHEN supabase_anon_key IS NOT NULL AND supabase_anon_key <> ''
        THEN extensions.pgp_sym_encrypt(supabase_anon_key, _key)
      ELSE NULL
    END
  WHERE supabase_url IS NOT NULL OR supabase_anon_key IS NOT NULL;
END $$;

-- =========================================================================
-- 6. Drop the plaintext columns. Existing edge-function code reading the
--    old columns will be updated in the application code in the same change
--    set; until that deploys it would error, which is preferable to leaking.
-- =========================================================================
ALTER TABLE public.apps
  DROP COLUMN IF EXISTS supabase_url,
  DROP COLUMN IF EXISTS supabase_anon_key;

-- =========================================================================
-- 7. Owner-callable RPC to SAVE credentials (encrypted).
--    Replaces the previous client-side INSERT/UPDATE on the credential cols.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_app_supabase_credentials(
  _app_id uuid,
  _supabase_url text,
  _supabase_anon_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
  _owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO _owner FROM public.apps WHERE id = _app_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'App not found';
  END IF;
  IF _owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Reject obvious mistakes (service_role keys must never be saved here).
  IF _supabase_anon_key IS NOT NULL AND position('service_role' in _supabase_anon_key) > 0 THEN
    RAISE EXCEPTION 'Refusing to store a service_role key. Only the public anon key is allowed.';
  END IF;

  _key := public._apps_credentials_key();

  UPDATE public.apps
  SET
    supabase_url_enc = CASE
      WHEN _supabase_url IS NULL OR _supabase_url = '' THEN NULL
      ELSE extensions.pgp_sym_encrypt(_supabase_url, _key)
    END,
    supabase_anon_key_enc = CASE
      WHEN _supabase_anon_key IS NULL OR _supabase_anon_key = '' THEN NULL
      ELSE extensions.pgp_sym_encrypt(_supabase_anon_key, _key)
    END
  WHERE id = _app_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_app_supabase_credentials(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_app_supabase_credentials(uuid, text, text) TO authenticated;

-- =========================================================================
-- 8. Service-role-only RPC for the analyze edge function to READ credentials.
--    Authenticated/anon are explicitly REVOKED; only service_role gets EXECUTE.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_app_supabase_credentials(_app_id uuid)
RETURNS TABLE(supabase_url text, supabase_anon_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
BEGIN
  -- Hard guard: only the service role may decrypt. RPC EXECUTE grants below
  -- enforce this at the API layer; this is defense in depth.
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  _key := public._apps_credentials_key();

  RETURN QUERY
  SELECT
    CASE WHEN a.supabase_url_enc IS NULL THEN NULL
         ELSE extensions.pgp_sym_decrypt(a.supabase_url_enc, _key) END,
    CASE WHEN a.supabase_anon_key_enc IS NULL THEN NULL
         ELSE extensions.pgp_sym_decrypt(a.supabase_anon_key_enc, _key) END
  FROM public.apps a
  WHERE a.id = _app_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_supabase_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_supabase_credentials(uuid) TO service_role;

-- =========================================================================
-- 9. Update app_has_backend to use the new encrypted columns.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.app_has_backend(_app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.apps
    WHERE id = _app_id
      AND user_id = auth.uid()
      AND supabase_url_enc IS NOT NULL
      AND supabase_anon_key_enc IS NOT NULL
  );
$$;

-- =========================================================================
-- 10. Make sure clients cannot read or write the encrypted bytea columns
--     directly. They go through the RPCs above.
-- =========================================================================
REVOKE SELECT (supabase_url_enc, supabase_anon_key_enc) ON public.apps FROM authenticated, anon;
REVOKE INSERT (supabase_url_enc, supabase_anon_key_enc) ON public.apps FROM authenticated, anon;
REVOKE UPDATE (supabase_url_enc, supabase_anon_key_enc) ON public.apps FROM authenticated, anon;