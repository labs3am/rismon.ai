/**
 * Mirror of src/lib/contentFilter.ts for edge functions.
 * Keep regex list in sync.
 */

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)\b/i,
  /\b(system|developer|assistant)\s*:\s*you\s+are\b/i,
  /\b(jailbreak|DAN mode|do anything now|act as (an? )?(unrestricted|uncensored))\b/i,
  /\b(disregard|override|bypass)\s+(your|the)\s+(instructions|guidelines|policies|rules|system prompt)\b/i,
  /\b(reveal|print|show|leak|expose)\s+(your|the)\s+(system\s*prompt|instructions|source\s*code|api[\s-]?key|secret|env|environment)\b/i,
  /<\s*script[\s>]/i,
  /\bjavascript\s*:/i,
  /\bdata:\s*text\/html/i,
  /\.(exe|bat|cmd|sh|ps1|msi|apk|dmg|jar|scr|vbs)\b/i,
  /\b(?:https?:\/\/|www\.)?(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gid|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at)\/\S+/i,
];

export function isSuspicious(text: string, maxLinks = 3): boolean {
  if (!text) return false;
  if (SUSPICIOUS_PATTERNS.some((re) => re.test(text))) return true;
  const urls = text.match(/https?:\/\/\S+/gi) ?? [];
  return urls.length > maxLinks;
}

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

export function isValidGithubRepoUrl(raw: string): boolean {
  if (!raw) return false;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  if (u.hostname.toLowerCase() !== 'github.com') return false;
  const parts = u.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) return false;
  const [owner, repo] = parts;
  return /^[A-Za-z0-9_.-]{1,100}$/.test(owner) && /^[A-Za-z0-9_.-]{1,100}$/.test(repo);
}