/**
 * Shared input-safety filter for user-controlled free text.
 * Blocks prompt-injection attempts, suspicious links, and obvious abuse vectors.
 * Mirror lives in supabase/functions/_shared/content-filter.ts — keep them in sync.
 */

const SUSPICIOUS_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)\b/i, reason: 'Prompt-injection language is not allowed.' },
  { re: /\b(system|developer|assistant)\s*:\s*you\s+are\b/i, reason: 'Prompt-injection language is not allowed.' },
  { re: /\b(jailbreak|DAN mode|do anything now|act as (an? )?(unrestricted|uncensored))\b/i, reason: 'Jailbreak phrasing is not allowed.' },
  { re: /\b(disregard|override|bypass)\s+(your|the)\s+(instructions|guidelines|policies|rules|system prompt)\b/i, reason: 'Prompt-injection language is not allowed.' },
  { re: /\b(reveal|print|show|leak|expose)\s+(your|the)\s+(system\s*prompt|instructions|source\s*code|api[\s-]?key|secret|env|environment)\b/i, reason: 'Requests to reveal internals are not allowed.' },
  { re: /<\s*script[\s>]/i, reason: 'Script tags are not allowed.' },
  { re: /\bjavascript\s*:/i, reason: 'javascript: links are not allowed.' },
  { re: /\bdata:\s*text\/html/i, reason: 'Inline HTML data URLs are not allowed.' },
  { re: /\.(exe|bat|cmd|sh|ps1|msi|apk|dmg|jar|scr|vbs)\b/i, reason: 'Executable file references are not allowed. Describe the issue in text instead.' },
  { re: /\b(?:https?:\/\/|www\.)?(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gid|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at)\/\S+/i, reason: 'Shortened URLs are not allowed — please paste the full link.' },
];

export function detectSuspicious(text: string, maxLinks = 3): string | null {
  if (!text) return null;
  for (const { re, reason } of SUSPICIOUS_PATTERNS) {
    if (re.test(text)) return reason;
  }
  const urls = text.match(/https?:\/\/\S+/gi) ?? [];
  if (urls.length > maxLinks) return `Too many links in one submission — please share at most ${maxLinks}.`;
  return null;
}

// Disposable / throwaway email domains we refuse for signup, waitlist, and contact.
// Kept short and high-signal — extend as needed.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.info',
  '10minutemail.com', '10minutemail.net', 'yopmail.com', 'sharklasers.com', 'maildrop.cc',
  'trashmail.com', 'getnada.com', 'fakeinbox.com', 'dispostable.com', 'mintemail.com',
  'mailnesia.com', 'throwawaymail.com', 'tempinbox.com', 'spambox.us', 'mohmal.com',
  'emailondeck.com', 'mail.tm', 'mailpoof.com', 'inboxbear.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

// Allowlist-style GitHub URL validator — blocks SSRF tricks (javascript:, file:,
// internal IPs, look-alike hosts).
export function isValidGithubRepoUrl(raw: string): boolean {
  if (!raw) return false;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  if (u.hostname.toLowerCase() !== 'github.com') return false;
  // Path must look like /owner/repo (optionally with .git or extra path)
  const parts = u.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) return false;
  const [owner, repo] = parts;
  return /^[A-Za-z0-9_.-]{1,100}$/.test(owner) && /^[A-Za-z0-9_.-]{1,100}$/.test(repo);
}