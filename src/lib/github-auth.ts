import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Centralized GitHub token + auth handling.
 *
 * GitHub OAuth tokens issued via Supabase do not expire on a fixed schedule,
 * but they CAN be revoked, invalidated, or simply missing after the Supabase
 * session refreshes (Supabase only stores `provider_token` from the most
 * recent OAuth sign-in). When that happens we need to:
 *
 *   1. Detect the failure (no token, or any 401/403 from api.github.com)
 *   2. Bounce the user through `signInWithOAuth({ provider: 'github' })`
 *      to re-issue a fresh `provider_token`
 *   3. Bring them back to the page they were on (redirectTo)
 *
 * To avoid surprise redirects and infinite loops we only auto-trigger the
 * re-auth flow once per page load; subsequent failures fall back to a toast
 * + manual reconnect.
 */

const REAUTH_FLAG = 'rismon_gh_reauth_in_progress';
const REAUTH_RETURN = 'rismon_gh_reauth_return';

/** Read current GitHub provider_token from the active Supabase session. */
export async function getGithubToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.provider_token ?? null;
}

/** True if the current user has a GitHub identity linked to their account. */
export async function hasGithubIdentity(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session?.user?.identities?.some(i => i.provider === 'github');
}

export interface ReauthOptions {
  /** Where to send the user after they re-authorize. Defaults to current URL. */
  redirectTo?: string;
  /** OAuth scopes to request. Defaults to read-only repo + user. */
  scopes?: string;
  /** Show a toast before redirecting. Defaults to true. */
  notify?: boolean;
  /** Custom toast message. */
  message?: string;
}

/**
 * Trigger the GitHub re-auth flow. Idempotent: if a re-auth is already in
 * progress in this tab we no-op so the user isn't bounced repeatedly.
 */
export async function reauthenticateGithub(opts: ReauthOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return;

  // Prevent infinite loops if GitHub keeps returning a stale token.
  if (sessionStorage.getItem(REAUTH_FLAG)) return;
  sessionStorage.setItem(REAUTH_FLAG, '1');

  const redirectTo = opts.redirectTo ?? window.location.href;
  sessionStorage.setItem(REAUTH_RETURN, redirectTo);

  if (opts.notify !== false) {
    toast.info(opts.message ?? 'Reconnecting to GitHub…');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: opts.scopes ?? 'repo read:user user:email',
      redirectTo,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    sessionStorage.removeItem(REAUTH_FLAG);
    toast.error('Failed to reconnect GitHub. Please try again.');
  }
}

/** Clear the re-auth flag. Call this once a fresh token has been confirmed. */
export function clearReauthFlag(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(REAUTH_FLAG);
  sessionStorage.removeItem(REAUTH_RETURN);
}

/**
 * Fetch wrapper that authenticates against the GitHub REST API, automatically
 * refreshing the session token once on 401/403. If no usable token can be
 * obtained, throws `GithubAuthRequiredError` so callers can route the user
 * to the connect page instead of crashing.
 */
export class GithubAuthRequiredError extends Error {
  constructor(message = 'GitHub authentication required') {
    super(message);
    this.name = 'GithubAuthRequiredError';
  }
}

export interface GithubFetchOptions extends RequestInit {
  /** When true (default), trigger re-auth flow on auth failure. */
  autoReauth?: boolean;
  /** When true (default), surface a toast on auth failure before redirect. */
  notifyOnReauth?: boolean;
  /** Where to come back to after re-auth. */
  reauthRedirectTo?: string;
}

/**
 * Wrap fetch() against api.github.com with token injection and a single
 * retry-after-refresh on 401/403. Falls back to GithubAuthRequiredError if
 * we still can't authenticate.
 */
export async function githubFetch(url: string, opts: GithubFetchOptions = {}): Promise<Response> {
  const { autoReauth = true, notifyOnReauth = true, reauthRedirectTo, ...init } = opts;

  let token = await getGithubToken();
  if (!token) {
    if (autoReauth) {
      await reauthenticateGithub({ redirectTo: reauthRedirectTo, notify: notifyOnReauth, message: 'GitHub session expired. Reconnecting…' });
    }
    throw new GithubAuthRequiredError();
  }

  const buildHeaders = (t: string): HeadersInit => ({
    Accept: 'application/vnd.github.v3+json',
    ...(init.headers || {}),
    Authorization: `token ${t}`,
  });

  let res = await fetch(url, { ...init, headers: buildHeaders(token) });

  if (res.status === 401 || res.status === 403) {
    // Try once: ask Supabase to refresh the session — this surfaces a fresh
    // provider_token if one is cached server-side. If that fails, redirect
    // through OAuth to mint a new token.
    const { data: refreshed } = await supabase.auth.refreshSession();
    const newToken = refreshed.session?.provider_token;

    if (newToken && newToken !== token) {
      token = newToken;
      res = await fetch(url, { ...init, headers: buildHeaders(token) });
    }

    if (res.status === 401 || res.status === 403) {
      if (autoReauth) {
        await reauthenticateGithub({ redirectTo: reauthRedirectTo, notify: notifyOnReauth, message: 'GitHub access expired. Reconnecting…' });
      }
      throw new GithubAuthRequiredError();
    }
  }

  // Successful response — token is valid, clear any stale re-auth flag.
  clearReauthFlag();
  return res;
}