/**
 * Rismon Repository Area Classifier
 *
 * Deterministic classification of repository inventory into suggested areas.
 *
 * The classifier is isolated behind the `RepositoryClassifier` interface so a
 * future AI/LLM classifier can be added without touching the inventory or CLI.
 * The initial implementation is fully deterministic — no external API calls.
 *
 * It only SUGGESTS areas a human may want to protect. It never makes
 * authorization decisions; the policy engine remains the final authority.
 */

import {
  FileCategory,
  RepositoryArea,
  RepositoryInventory,
  RepositoryFile,
} from './types';
import {
  buildInventory,
  categorizeFile,
  isAuthLikePath,
  isBackendLikePath,
  isFrontendLikePath,
  isDatabaseLikePath,
  isDeploymentLikePath,
} from './inventory';

/**
 * Isolation seam for area classification.
 * A future AI/LLM classifier implements this same interface.
 */
export interface RepositoryClassifier {
  classify(inventory: RepositoryInventory): RepositoryArea[];
}

/** Minimum number of matched files required before an area is suggested. */
const MIN_FILES_FOR_AREA = 1;

/** Doc-like areas require a bit more evidence to avoid single-stray-file noise. */
const MIN_FILES_FOR_DOC_AREA = 2;

/** Core Application Logic requires several source files as evidence. */
const MIN_FILES_FOR_CORE_AREA = 3;

/**
 * Groups matched files into real path patterns for policy rules.
 * When >= GROUP_THRESHOLD files share a real directory prefix, that directory
 * becomes a real `prefix/**` pattern; otherwise real file paths are returned.
 * Never invents paths that do not exist in the repository.
 */
const GROUP_THRESHOLD = 3;

/** Minimum number of grouped-directory patterns before fallback to real paths. */
const MAX_GROUPED_PATTERNS = 6;

/**
 * Clamps confidence into the documented bounds [0.01, 0.99].
 * Confidence is a suggestion, never a certainty.
 */
function clampConfidence(value: number): number {
  return Math.min(0.99, Math.max(0.01, value));
}

/**
 * Deterministic path grouping for policy-rule-ready patterns.
 */
function groupPaths(files: RepositoryFile[]): string[] {
  // Count how many files live directly under each real directory prefix.
  const byDir = new Map<string, RepositoryFile[]>();
  for (const file of files) {
    const segments = file.path.split('/');
    if (segments.length < 2) continue;
    const dir = segments.slice(0, -1).join('/');
    const list = byDir.get(dir) || [];
    list.push(file);
    byDir.set(dir, list);
  }

  const groupedDirs = Array.from(byDir.entries())
    .filter(([, list]) => list.length >= GROUP_THRESHOLD)
    .map(([dir]) => `${dir}/**`)
    .sort();

  if (groupedDirs.length === 0) {
    // Not enough files per directory to justify a real `dir/**` grouping:
    // return real file paths so patterns remain accurate.
    return files.map((f) => f.path).sort();
  }

  // Prefer grouped directory patterns, capped to keep output readable.
  const grouped = new Set(groupedDirs.slice(0, MAX_GROUPED_PATTERNS));
  const patterns = Array.from(grouped);

  // Keep real paths for files not covered by any grouped directory.
  for (const file of files) {
    const segments = file.path.split('/');
    if (segments.length < 2) {
      patterns.push(file.path);
      continue;
    }
    const dir = segments.slice(0, -1).join('/');
    const dirPattern = `${dir}/**`;
    if (!grouped.has(dirPattern)) {
      patterns.push(file.path);
    }
  }

  return Array.from(new Set(patterns)).sort();
}
/** Deterministic tier-based confidence for an area. */
type ConfidenceTier = 'strong' | 'medium' | 'weak';

/**
 * Minimal per-area evidence used by the deterministic classifier.
 * `signalDirHints`/`signalNameFragments` are matched against real paths only.
 */
interface AreaDefinition {
  id: string;
  name: string;
  description: string;
  minFiles: number;
  /** Lowercase dir hints; a matching directory is strong evidence. */
  dirHints: ReadonlySet<string>;
  /** Lowercase filename fragments; a matching filename is medium evidence. */
  nameFragments: readonly string[];
  /** Optional extra file paths (lowercase, real known filenames). */
  knownFiles?: readonly string[];
}

const AREA_DEFINITIONS: readonly AreaDefinition[] = [
  {
    id: 'auth-security',
    name: 'Authentication & Security',
    description:
      'Authentication, sessions, and security-related code. Changes here can affect who can access what.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set([
      'auth', 'authentication', 'security', 'session', 'sessions', 'login',
      'rbac', 'acl',
    ]),
    nameFragments: [
      'auth', 'login', 'logout', 'session', 'password', 'rbac', 'acl',
      'security',
    ],
  },
  {
    id: 'database',
    name: 'Database & Data',
    description:
      'Migrations, schemas, and data-access code. Changes can alter how data is stored and read.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set([
      'migrations', 'migration', 'db', 'database', 'prisma', 'schema',
    ]),
    nameFragments: ['migration', 'schema'],
  },
  {
    id: 'backend-api',
    name: 'Backend / API',
    description:
      'Server-side routes, controllers, and API endpoints.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set([
      'api', 'server', 'routes', 'controllers', 'services', 'endpoints',
    ]),
    nameFragments: [],
  },
  {
    id: 'deployment-infra',
    name: 'Deployment & Infrastructure',
    description:
      'Build, release, and infrastructure configuration. Changes affect how the product ships.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set([
      '.github', 'infra', 'infrastructure', 'terraform', 'k8s', 'kubernetes',
      'helm', 'deploy', 'deployment',
    ]),
    nameFragments: [],
    knownFiles: [
      'dockerfile', 'vercel.json', 'netlify.toml', 'fly.toml',
      'railway.json', 'render.yaml', 'procfile', 'cloudbuild.yaml',
    ],
  },
  {
    id: 'dependencies',
    name: 'Dependencies',
    description:
      'Dependency manifests and lockfiles. Changes here alter what code runs.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set<string>(),
    nameFragments: [],
    knownFiles: [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'bun.lock', 'bun.lockb', 'requirements.txt', 'pyproject.toml', 'go.mod',
      'cargo.toml', 'pom.xml', 'composer.json', 'gemfile',
    ],
  },
  {
    id: 'frontend',
    name: 'Frontend',
    description:
      'User-facing components, pages, and styles. Changes here affect what users see.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set([
      'components', 'pages', 'views', 'layouts', 'styles', 'css', 'scss',
      'less',
    ]),
    nameFragments: [],
  },
  {
    id: 'tests',
    name: 'Tests',
    description: 'Automated tests and end-to-end specs.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set([
      'test', 'tests', 'spec', 'specs', '__tests__', 'e2e', 'cypress',
    ]),
    nameFragments: [],
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'README and docs that explain the product and how to work on it.',
    minFiles: MIN_FILES_FOR_DOC_AREA,
    dirHints: new Set(['docs', 'doc', 'documentation']),
    nameFragments: [],
    knownFiles: ['readme.md'],
  },
  {
    id: 'configuration',
    name: 'Configuration',
    description:
      'Build and tooling configuration. Changes here affect how the project compiles and runs.',
    minFiles: MIN_FILES_FOR_AREA,
    dirHints: new Set<string>(),
    nameFragments: [],
    knownFiles: [
      'tsconfig.json', 'jsconfig.json', 'vite.config.ts', 'vite.config.js',
      'webpack.config.js', 'webpack.config.ts', 'tailwind.config.ts',
      'tailwind.config.js', 'postcss.config.js', 'eslint.config.js',
      '.eslintrc.json', '.eslintrc.js', 'vitest.config.ts', 'jest.config.js',
      'next.config.js', 'nuxt.config.ts', 'svelte.config.js',
      'astro.config.mjs', '.gitignore', '.editorconfig', '.npmrc',
    ],
  },
];

/**
 * Deterministic area classifier driven by path/dir/known-file signals.
 * Only suggests areas backed by real evidence in the repository.
 */
export class DeterministicClassifier implements RepositoryClassifier {
  classify(inventory: RepositoryInventory): RepositoryArea[] {
    const files = inventory.files;
    const areas: RepositoryArea[] = [];

    // Tracks which source files were claimed by a specific area, so the
    // remaining unclaimed source files can form a Core Application Logic area.
    const claimed = new Set<string>();

    for (const def of AREA_DEFINITIONS) {
      const matched = files.filter((file) =>
        this.matchesArea(file, def, inventory)
      );
      if (matched.length < def.minFiles) continue;

      // Evidence is collected deterministically, strongest-first.
      const signals: string[] = [];
      const tier = this.collectSignals(matched, def, signals);
      claimedForAreaFiles(matched, claimed);

      areas.push({
        id: def.id,
        name: def.name,
        description: def.description,
        paths: groupPaths(matched),
        confidence: clampConfidence(tierToConfidence(tier)),
        signals,
      });
    }

    // Core Application Logic: remaining unclaimed source files.
    const coreFiles = files.filter(
      (file) =>
        file.category === FileCategory.SOURCE &&
        !claimed.has(file.path) &&
        !isAuthLikePath(file.path) &&
        !isDatabaseLikePath(file.path) &&
        !isDeploymentLikePath(file.path)
    );
    if (coreFiles.length >= MIN_FILES_FOR_CORE_AREA) {
      const coreDef: AreaDefinition = {
        id: 'core-logic',
        name: 'Core Application Logic',
        description:
          'Main application source that does not clearly belong to another area.',
        minFiles: MIN_FILES_FOR_CORE_AREA,
        dirHints: new Set<string>(),
        nameFragments: [],
      };
      const signals: string[] = [
        `count of unclaimed source files: ${coreFiles.length}`,
      ];
      areas.push({
        id: coreDef.id,
        name: coreDef.name,
        description: coreDef.description,
        paths: groupPaths(coreFiles),
        confidence: clampConfidence(0.4),
        signals,
      });
    }

    // Deterministic ordering: confidence desc, then stable id.
    areas.sort((a, b) =>
      b.confidence !== a.confidence
        ? b.confidence - a.confidence
        : a.id.localeCompare(b.id)
    );

    return areas;
  }

  /**
   * True when a file matches the area definition via dirs, name fragments,
   * known filenames, or the area's category hints.
   */
  private matchesArea(
    file: RepositoryFile,
    def: AreaDefinition,
    inventory: RepositoryInventory
  ): boolean {
    const fileName = file.name.toLowerCase();

    if (def.knownFiles && def.knownFiles.includes(fileName)) return true;
    if (def.dirHints.size > 0) {
      const dirs = file.path.split('/').slice(0, -1).map((s) => s.toLowerCase());
      if (dirs.some((d) => def.dirHints.has(d))) return true;
    }
    const stem = fileName.replace(/\\.[^.]+$/, '');
    if (def.nameFragments.some((frag) => stem.includes(frag))) return true;

    return false;
  }

  /**
   * Collects deterministic signals and returns a confidence tier.
   */
  private collectSignals(
    matched: RepositoryFile[],
    def: AreaDefinition,
    signals: string[]
  ): ConfidenceTier {
    const dirMatches: string[] = [];
    const nameMatches: string[] = [];
    const knownMatches: string[] = [];

    for (const file of matched) {
      const fileName = file.name.toLowerCase();
      const dirs = file.path.split('/').slice(0, -1);
      const hitDirs = dirs.filter((d) => def.dirHints.has(d.toLowerCase()));
      if (hitDirs.length > 0) {
        dirMatches.push(file.path);
        continue;
      }
      if (def.knownFiles && def.knownFiles.includes(fileName)) {
        knownMatches.push(file.path);
        continue;
      }
      const stem = fileName.replace(/\\.[^.]+$/, '');
      if (def.nameFragments.some((frag) => stem.includes(frag))) {
        nameMatches.push(file.path);
      }
    }

    if (dirMatches.length > 0) {
      signals.push(`directory matches: ${dirMatches.slice(0, 3).join(', ')}`);
    }
    if (nameMatches.length > 0) {
      signals.push(`name matches: ${nameMatches.slice(0, 3).join(', ')}`);
    }
    if (knownMatches.length > 0) {
      signals.push(`known config files: ${knownMatches.slice(0, 3).join(', ')}`);
    }
    signals.push(`matched file count: ${matched.length}`);

    if (dirMatches.length > 0) return 'strong';
    if (knownMatches.length > 0 || nameMatches.length > 0) return 'medium';
    return 'weak';
  }
}

/** Records every matched file as claimed for core-logic computation. */
function claimedForAreaFiles(matched: RepositoryFile[], claimed: Set<string>): void {
  for (const file of matched) claimed.add(file.path);
}

/** Maps a confidence tier to a deterministic numeric confidence in [0,1]. */
function tierToConfidence(tier: ConfidenceTier): number {
  switch (tier) {
    case 'strong':
      return 0.9;
    case 'medium':
      return 0.6;
    case 'weak':
      return 0.3;
  }
}
