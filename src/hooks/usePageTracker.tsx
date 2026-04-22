import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "rismon_sid";

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    // sessionStorage may be blocked — fall back to per-call random id
    return crypto.randomUUID();
  }
}

/**
 * Logs a page view to Supabase on every route change.
 * Privacy-safe: no IP, no UA string, no fingerprint. Just path + referrer + a
 * per-tab session id so we can compute "unique sessions".
 */
export function usePageTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;

    const sessionId = getOrCreateSessionId();

    // Strip our own origin from referrer to keep "internal" out of the report.
    let referrer = "";
    try {
      const ref = document.referrer;
      if (ref && !ref.startsWith(window.location.origin)) {
        referrer = new URL(ref).hostname;
      }
    } catch {
      /* ignore */
    }

    const viewport = `${window.innerWidth}x${window.innerHeight}`;

    supabase.auth.getUser().then(({ data }) => {
      // fire-and-forget; ignore errors (e.g. offline)
      supabase
        .from("page_views")
        .insert({
          path,
          referrer: referrer || null,
          session_id: sessionId,
          user_id: data.user?.id ?? null,
          viewport,
        })
        .then(() => {
          /* noop */
        });
    });
  }, [location.pathname]);
}

export default usePageTracker;