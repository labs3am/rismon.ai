export type ChangeType = 'NEW' | 'IMPROVED' | 'FIXED';

export interface Change {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  summary: string;
  changes: Change[];
}

/**
 * Parse a markdown-ish release-notes draft into structured entries.
 *
 * Format (one or more entries, separated by `---` on its own line):
 *
 *   # v2.3 — 2026-04-22 — Admin command center
 *   A private admin dashboard for the Rismon team — privacy-safe overview…
 *
 *   - NEW: Admin dashboard at /admin
 *   - IMPROVED: Privacy: admins see metadata only
 *   - FIXED: Scans timing out silently
 *
 *   ---
 *
 *   # v2.2 — 2026-04-10 — Smarter loading
 *   …
 *
 * Rules:
 *  - Header line MUST start with `#` and use ` — ` (em dash, spaces) as separator.
 *    `-` (hyphen with spaces) is also accepted as a fallback.
 *  - First non-empty paragraph after the header is the summary.
 *  - Bullet lines start with `-` or `*`. Prefix `NEW:` / `IMPROVED:` / `FIXED:`
 *    sets the change type. Unprefixed bullets default to `IMPROVED`.
 *  - Type prefix is case-insensitive. Synonyms: `ADDED`→NEW, `FIX`→FIXED, `CHANGE`/`CHANGED`→IMPROVED.
 */
export function parseChangelog(source: string): ChangelogEntry[] {
  const blocks = source
    .split(/^\s*---\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map(parseEntry).filter((e): e is ChangelogEntry => e !== null);
}

const TYPE_MAP: Record<string, ChangeType> = {
  NEW: 'NEW',
  ADDED: 'NEW',
  ADD: 'NEW',
  IMPROVED: 'IMPROVED',
  IMPROVE: 'IMPROVED',
  CHANGED: 'IMPROVED',
  CHANGE: 'IMPROVED',
  FIXED: 'FIXED',
  FIX: 'FIXED',
};

function parseEntry(block: string): ChangelogEntry | null {
  const lines = block.split('\n');
  const headerIdx = lines.findIndex((l) => l.trim().startsWith('#'));
  if (headerIdx === -1) return null;

  const headerLine = lines[headerIdx].replace(/^#+\s*/, '').trim();
  // Split on em dash or " - "
  const parts = headerLine.split(/\s+[—-]\s+/);
  if (parts.length < 3) return null;

  const [version, date, ...titleParts] = parts;
  const title = titleParts.join(' — ').trim();

  // Everything after the header
  const rest = lines.slice(headerIdx + 1);

  // Summary: lines until the first bullet, joined and trimmed
  const firstBulletIdx = rest.findIndex((l) => /^\s*[-*]\s+/.test(l));
  const summaryLines =
    firstBulletIdx === -1 ? rest : rest.slice(0, firstBulletIdx);
  const summary = summaryLines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');

  const bulletLines = firstBulletIdx === -1 ? [] : rest.slice(firstBulletIdx);
  const changes: Change[] = [];
  for (const raw of bulletLines) {
    const m = raw.match(/^\s*[-*]\s+(.*)$/);
    if (!m) continue;
    const body = m[1].trim();
    const typeMatch = body.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
    if (typeMatch) {
      const key = typeMatch[1].toUpperCase();
      const mapped = TYPE_MAP[key];
      if (mapped) {
        changes.push({ type: mapped, text: typeMatch[2].trim() });
        continue;
      }
    }
    changes.push({ type: 'IMPROVED', text: body });
  }

  return {
    version: version.trim(),
    date: date.trim(),
    title,
    summary,
    changes,
  };
}