/**
 * Rismon Repository Inventory
 *
 * Deterministic, READ-ONLY filesystem inspection of a repository.
 *
 * Safety guarantees:
 * - Never executes repository code
 * - Never reads file contents in v0.1 (paths, extensions, sizes, structure only)
 * - Never follows symlinks (cannot escape the repository root)
 * - Never writes anything
 * - Hard caps on depth and file count
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FileCategory,
  RepositoryFile,
  RepositoryInventory,
  AnalyzerError,
} from './types';

/**
 * Generated/vendor directories that are always skipped.
 * Repo-relative names (matched on any path segment).
 */
export const DEFAULT_IGNORED_DIRS: ReadonlySet<string> = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-cli',
  'dist-ssr',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  'out',
  'target',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
  '.turbo',
  '.cache',
]);

/** Maximum directory depth to walk from the repository root. */
const MAX_DEPTH = 15;

/** Maximum number of files to inventory. */
const MAX_FILES = 50_000;

/** Lowercase filename → category for known manifest/config/deployment files. */
const KNOWN_ROOT_FILENAMES: Readonly<Record<string, FileCategory>> = {
  // Dependency manifests
  'package.json': FileCategory.MANIFEST,
  'package-lock.json': FileCategory.MANIFEST,
  'yarn.lock': FileCategory.MANIFEST,
  'pnpm-lock.yaml': FileCategory.MANIFEST,
  'bun.lock': FileCategory.MANIFEST,
  'bun.lockb': FileCategory.MANIFEST,
  'requirements.txt': FileCategory.MANIFEST,
  'pyproject.toml': FileCategory.MANIFEST,
  'go.mod': FileCategory.MANIFEST,
  'Cargo.toml': FileCategory.MANIFEST,
  'pom.xml': FileCategory.MANIFEST,
  'composer.json': FileCategory.MANIFEST,
  'Gemfile': FileCategory.MANIFEST,
  // Deployment configuration
  dockerfile: FileCategory.DEPLOYMENT,
  'vercel.json': FileCategory.DEPLOYMENT,
  'netlify.toml': FileCategory.DEPLOYMENT,
  'fly.toml': FileCategory.DEPLOYMENT,
  'railway.json': FileCategory.DEPLOYMENT,
  'render.yaml': FileCategory.DEPLOYMENT,
  procfile: FileCategory.DEPLOYMENT,
  'cloudbuild.yaml': FileCategory.DEPLOYMENT,
  // Common configuration
  'tsconfig.json': FileCategory.CONFIG,
  'jsconfig.json': FileCategory.CONFIG,
  'vite.config.ts': FileCategory.CONFIG,
  'vite.config.js': FileCategory.CONFIG,
  'webpack.config.js': FileCategory.CONFIG,
  'webpack.config.ts': FileCategory.CONFIG,
  'tailwind.config.ts': FileCategory.CONFIG,
  'tailwind.config.js': FileCategory.CONFIG,
  'postcss.config.js': FileCategory.CONFIG,
  'eslint.config.js': FileCategory.CONFIG,
  '.eslintrc.json': FileCategory.CONFIG,
  '.eslintrc.js': FileCategory.CONFIG,
  'vitest.config.ts': FileCategory.CONFIG,
  'jest.config.js': FileCategory.CONFIG,
  'next.config.js': FileCategory.CONFIG,
  'nuxt.config.ts': FileCategory.CONFIG,
  'svelte.config.js': FileCategory.CONFIG,
  'astro.config.mjs': FileCategory.CONFIG,
  '.gitignore': FileCategory.CONFIG,
  '.editorconfig': FileCategory.CONFIG,
  '.npmrc': FileCategory.CONFIG,
};

/** Extension (lowercase, without dot) → category. */
const EXTENSION_CATEGORIES: Readonly<Record<string, FileCategory>> = {
  ts: FileCategory.SOURCE,
  tsx: FileCategory.SOURCE,
  js: FileCategory.SOURCE,
  jsx: FileCategory.SOURCE,
  mjs: FileCategory.SOURCE,
  cjs: FileCategory.SOURCE,
  vue: FileCategory.SOURCE,
  svelte: FileCategory.SOURCE,
  go: FileCategory.SOURCE,
  rs: FileCategory.SOURCE,
  py: FileCategory.SOURCE,
  rb: FileCategory.SOURCE,
  java: FileCategory.SOURCE,
  kt: FileCategory.SOURCE,
  php: FileCategory.SOURCE,
  cs: FileCategory.SOURCE,
  graphql: FileCategory.SOURCE,
  gql: FileCategory.SOURCE,
  sql: FileCategory.DATABASE,
  prisma: FileCategory.DATABASE,
  json: FileCategory.CONFIG,
  yaml: FileCategory.CONFIG,
  yml: FileCategory.CONFIG,
  toml: FileCategory.CONFIG,
  ini: FileCategory.CONFIG,
  env: FileCategory.CONFIG,
  spec: FileCategory.TEST,
  test: FileCategory.TEST,
  md: FileCategory.DOC,
  mdx: FileCategory.DOC,
  txt: FileCategory.DOC,
  rst: FileCategory.DOC,
  adoc: FileCategory.DOC,
};
/** Directory name (lowercase) that suggests database-related files. */
const DATABASE_DIR_HINTS: ReadonlySet<string> = new Set([
  'migrations', 'migration', 'db', 'database', 'prisma', 'schema',
]);

/** Test-directory hints (lowercase). */
const TEST_DIR_HINTS: ReadonlySet<string> = new Set([
  'test', 'tests', 'spec', 'specs', '__tests__', 'e2e', 'cypress',
]);

/** Deployment-directory hints (lowercase). */
const DEPLOY_DIR_HINTS: ReadonlySet<string> = new Set([
  '.github', 'infra', 'infrastructure', 'terraform', 'k8s', 'kubernetes',
  'helm', 'deploy', 'deployment',
]);

/** Docs-directory hints (lowercase). */
const DOC_DIR_HINTS: ReadonlySet<string> = new Set(['docs', 'doc', 'documentation']);

/** Backend/API-directory hints (lowercase). */
const BACKEND_DIR_HINTS: ReadonlySet<string> = new Set([
  'api', 'server', 'routes', 'controllers', 'services', 'endpoints',
]);

/** Frontend-directory hints (lowercase). */
const FRONTEND_DIR_HINTS: ReadonlySet<string> = new Set([
  'components', 'pages', 'views', 'layouts', 'styles', 'css', 'scss', 'less',
]);

/** Auth/security-directory hints (lowercase). */
const AUTH_DIR_HINTS: ReadonlySet<string> = new Set([
  'auth', 'authentication', 'security', 'session', 'sessions', 'login',
  'rbac', 'acl',
]);

/** Filename fragments (lowercase) that suggest auth/security files. */
const AUTH_NAME_FRAGMENTS: readonly string[] = [
  'auth', 'login', 'logout', 'signup', 'session', 'password', 'rbac', 'acl', 'security',
];

/**
 * True when a repo-relative path lives inside a generated/ignored directory.
 */
export function isIgnoredPath(path: string): boolean {
  return path.split('/').some((segment) => DEFAULT_IGNORED_DIRS.has(segment.toLowerCase()));
}

/**
 * Normalizes a repo-relative path: forward slashes, no leading './' or '/'.
 */
function normalizeRelPath(raw: string): string {
  let p = raw.replace(/\\/g, '/');
  p = p.replace(/^(\.\/|\/)+/, '');
  p = p.replace(/\/+/g, '/');
  return p.replace(/\/$/, '');
}

/**
 * Extracts the lowercase extension without the leading dot ('' when absent).
 */
function extractExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

/**
 * True when a filename stem ends with .test/.spec (e.g. foo.test.ts).
 */
function isTestStem(fileName: string): boolean {
  const stem = fileName.replace(/\\.[^.]+$/, '');
  return /\\.(test|spec)$/.test(stem);
}

/**
 * True when any repo-relative path segment (lowercase) is a known hint dir.
 */
function hasHintDir(path: string, hints: ReadonlySet<string>): boolean {
  return path.split('/').slice(0, -1).some((s) => hints.has(s.toLowerCase()));
}

/**
 * Determines the broad category for a file using its path and name only.
 * Deterministic; content is never read.
 */
export function categorizeFile(relPath: string, name: string): FileCategory {
  const segments = relPath.split('/');
  const fileName = name.toLowerCase();
  const extension = extractExtension(name);

  // 1. Known root-level filenames win (manifests, deployment, common config).
  if (segments.length === 1 && KNOWN_ROOT_FILENAMES[fileName]) {
    return KNOWN_ROOT_FILENAMES[fileName];
  }

  // 2. Test-directory hints, or *.test.* / *.spec.* filenames.
  if (hasHintDir(relPath, TEST_DIR_HINTS)) return FileCategory.TEST;
  if (isTestStem(fileName)) return FileCategory.TEST;

  // 3. Deployment-directory hints (e.g. .github/workflows).
  if (hasHintDir(relPath, DEPLOY_DIR_HINTS)) return FileCategory.DEPLOYMENT;

  // 4. Database-directory hints (e.g. prisma/schema, migrations).
  if (hasHintDir(relPath, DATABASE_DIR_HINTS)) return FileCategory.DATABASE;

  // 5. Docs-directory hints.
  if (hasHintDir(relPath, DOC_DIR_HINTS)) return FileCategory.DOC;

  // 6. Extension-based category.
  if (extension && EXTENSION_CATEGORIES[extension]) {
    return EXTENSION_CATEGORIES[extension];
  }

  return FileCategory.OTHER;
}

/**
 * Builds a deterministic repository inventory by walking the filesystem.
 *
 * @param rootPath - Absolute path to the repository root
 * @returns Structured inventory of the repository
 * @throws AnalyzerError when the root path does not exist or is not a directory
 */
export function buildInventory(rootPath: string): RepositoryInventory {
  const absoluteRoot = path.resolve(rootPath);

  let rootStat: fs.Stats;
  try {
    rootStat = fs.statSync(absoluteRoot);
  } catch {
    throw new AnalyzerError(`Repository root does not exist: ${absoluteRoot}`);
  }
  if (!rootStat.isDirectory()) {
    throw new AnalyzerError(`Repository root is not a directory: ${absoluteRoot}`);
  }

  const repositoryName = path.basename(absoluteRoot);
  const files: RepositoryFile[] = [];
  const ignoredDirs: string[] = [];

  const walk = (dirRel: string, depth: number): void => {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;
    const dirAbs = dirRel === '' ? absoluteRoot : path.join(absoluteRoot, dirRel);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      // Unreadable directory (permissions): skip silently, deterministic.
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) return;
      const relPath = dirRel === '' ? entry.name : `${dirRel}/${entry.name}`;

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(entry.name.toLowerCase())) {
          ignoredDirs.push(normalizeRelPath(relPath));
          continue;
        }
        walk(relPath, depth + 1);
        continue;
      }

      // Files only; symlinks are never followed.
      if (!entry.isFile()) continue;

      let size = 0;
      try {
        size = fs.statSync(path.join(absoluteRoot, relPath)).size;
      } catch {
        size = 0;
      }

      files.push({
        path: normalizeRelPath(relPath),
        name: entry.name,
        extension: extractExtension(entry.name),
        size,
        category: categorizeFile(normalizeRelPath(relPath), entry.name),
      });
    }
  };

  walk('', 0);

  // Deterministic ordering: alphabetical repo-relative path.
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  ignoredDirs.sort();

  return {
    repositoryName,
    rootPath: absoluteRoot,
    files,
    ignoredDirs: Array.from(new Set(ignoredDirs)),
  };
}

/** True when a repo-relative path looks auth/security related (dirs or names). */
export function isAuthLikePath(relPath: string): boolean {
  const segments = relPath.split('/');
  const fileName = (segments[segments.length - 1] || '').toLowerCase();
  const stem = fileName.replace(/\\.[^.]+$/, '');
  if (hasHintDir(relPath, AUTH_DIR_HINTS)) return true;
  return AUTH_NAME_FRAGMENTS.some((frag) => stem.includes(frag));
}

/** True when the path is in a backend/API-style directory. */
export function isBackendLikePath(relPath: string): boolean {
  return hasHintDir(relPath, BACKEND_DIR_HINTS);
}

/** True when the path is in a frontend-style directory. */
export function isFrontendLikePath(relPath: string): boolean {
  return hasHintDir(relPath, FRONTEND_DIR_HINTS);
}

/** True when the path lives in a database-ish directory. */
export function isDatabaseLikePath(relPath: string): boolean {
  return hasHintDir(relPath, DATABASE_DIR_HINTS);
}

/** True when the path lives in a deployment-ish directory. */
export function isDeploymentLikePath(relPath: string): boolean {
  return hasHintDir(relPath, DEPLOY_DIR_HINTS);
}
