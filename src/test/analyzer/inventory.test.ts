/**
 * Tests for Rismon Repository Inventory
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildInventory,
  categorizeFile,
  isIgnoredPath,
  isAuthLikePath,
  isBackendLikePath,
  isFrontendLikePath,
  isDatabaseLikePath,
  isDeploymentLikePath,
} from '../../analyzer/inventory';
import { FileCategory, AnalyzerError } from '../../analyzer/types';

function writePlaceholder(root: string, rel: string, content: string = 'placeholder'): void {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

function snapshotTree(inv: ReturnType<typeof buildInventory>): string {
  return JSON.stringify({
    repositoryName: inv.repositoryName,
    files: inv.files.map((f) => ({ path: f.path, category: f.category })),
    ignoredDirs: inv.ignoredDirs,
  }, null, 2);
}

describe('buildInventory', () => {
  const tmpRoot = path.join(__dirname, '..', '..', '..', 'tmp-test-inventory');
  let tmpDir: string;

  beforeAll(() => fs.mkdirSync(tmpRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  beforeEach(() => {
    tmpDir = path.join(tmpRoot, `build-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('returns empty inventory for an empty directory', () => {
    const inventory = buildInventory(tmpDir);
    expect(inventory.files).toEqual([]);
    expect(inventory.ignoredDirs).toEqual([]);
    expect(inventory.repositoryName).toBe(path.basename(tmpDir));
  });

  it('skips ignored directories', () => {
    writePlaceholder(tmpDir, 'node_modules/pkg/index.js', 'ignored');
    writePlaceholder(tmpDir, 'dist/bundle.js', 'ignored');
    writePlaceholder(tmpDir, 'build/output.js', 'ignored');
    writePlaceholder(tmpDir, '.git/HEAD', 'ignored');
    writePlaceholder(tmpDir, 'src/main.ts', 'real');

    const inventory = buildInventory(tmpDir);
    expect(inventory.files.length).toBe(1);
    expect(inventory.files[0].path).toBe('src/main.ts');
    const ignoredPaths = inventory.ignoredDirs.map((p) => p.toLowerCase());
    expect(ignoredPaths).toContain('node_modules');
    expect(ignoredPaths).toContain('dist');
    expect(ignoredPaths).toContain('build');
    expect(ignoredPaths).toContain('.git');
  });

  it('does not enumerate files inside ignored dirs', () => {
    writePlaceholder(tmpDir, 'node_modules/left-pad/index.js', 'ignored');
    writePlaceholder(tmpDir, 'src/app.ts', 'real');
    const inventory = buildInventory(tmpDir);
    const paths = inventory.files.map((f) => f.path);
    expect(paths).not.toContain('node_modules/left-pad/index.js');
    expect(paths).toContain('src/app.ts');
  });

  it('handles .git correctly', () => {
    writePlaceholder(tmpDir, '.git/config', 'ignored');
    const inventory = buildInventory(tmpDir);
    expect(inventory.ignoredDirs.map((p) => p.toLowerCase())).toContain('.git');
    expect(inventory.files.length).toBe(0);
  });

  it('handles .gitignore file alongside .git dir', () => {
    writePlaceholder(tmpDir, '.gitignore', 'root .gitignore');
    writePlaceholder(tmpDir, 'src/index.ts', 'real');
    const inventory = buildInventory(tmpDir);
    expect(inventory.files.length).toBe(2);
    const names = inventory.files.map((f) => f.name);
    expect(names).toContain('.gitignore');
    expect(names).toContain('index.ts');
  });

  it('throws for missing directory', () => {
    expect(() => buildInventory(path.join(tmpDir, 'missing'))).toThrow(AnalyzerError);
  });

  it('throws for file path not directory', () => {
    const file = path.join(tmpDir, 'a-file.txt');
    fs.writeFileSync(file, 'not a dir', 'utf-8');
    expect(() => buildInventory(file)).toThrow(AnalyzerError);
  });

  it('is deterministic across repeated runs', () => {
    writePlaceholder(tmpDir, 'b.ts', 'b');
    writePlaceholder(tmpDir, 'a.ts', 'a');
    writePlaceholder(tmpDir, 'sub/c.ts', 'c');
    const run1 = buildInventory(tmpDir);
    const run2 = buildInventory(tmpDir);
    expect(snapshotTree(run1)).toBe(snapshotTree(run2));
  });
});

describe('categorizeFile', () => {
  it('classifies TypeScript source files as source', () => {
    expect(categorizeFile('src/index.ts', 'index.ts')).toBe(FileCategory.SOURCE);
    expect(categorizeFile('app.tsx', 'app.tsx')).toBe(FileCategory.SOURCE);
    expect(categorizeFile('utils.mjs', 'utils.mjs')).toBe(FileCategory.SOURCE);
  });

  it('classifies config files', () => {
    expect(categorizeFile('.eslintrc.json', '.eslintrc.json')).toBe(FileCategory.CONFIG);
    expect(categorizeFile('tsconfig.json', 'tsconfig.json')).toBe(FileCategory.CONFIG);
    expect(categorizeFile('vite.config.ts', 'vite.config.ts')).toBe(FileCategory.CONFIG);
  });

  it('classifies manifest files', () => {
    expect(categorizeFile('package.json', 'package.json')).toBe(FileCategory.MANIFEST);
    expect(categorizeFile('yarn.lock', 'yarn.lock')).toBe(FileCategory.MANIFEST);
    expect(categorizeFile('go.mod', 'go.mod')).toBe(FileCategory.MANIFEST);
  });

  it('classifies deployment files', () => {
    expect(categorizeFile('Dockerfile', 'Dockerfile')).toBe(FileCategory.DEPLOYMENT);
    expect(categorizeFile('vercel.json', 'vercel.json')).toBe(FileCategory.DEPLOYMENT);
    expect(categorizeFile('Procfile', 'Procfile')).toBe(FileCategory.DEPLOYMENT);
  });

  it('classifies test files', () => {
    expect(categorizeFile('src/__tests__/utils.test.ts', 'utils.test.ts')).toBe(FileCategory.TEST);
    expect(categorizeFile('test/helpers.spec.js', 'helpers.spec.js')).toBe(FileCategory.TEST);
  });

  it('classifies database files', () => {
    expect(categorizeFile('prisma/schema.prisma', 'schema.prisma')).toBe(FileCategory.DATABASE);
    expect(categorizeFile('migrations/001.sql', '001.sql')).toBe(FileCategory.DATABASE);
  });

  it('classifies documentation files', () => {
    expect(categorizeFile('README.md', 'README.md')).toBe(FileCategory.DOC);
    expect(categorizeFile('docs/guide.md', 'guide.md')).toBe(FileCategory.DOC);
  });

  it('returns OTHER for unrecognized files', () => {
    expect(categorizeFile('data/file.csv', 'file.csv')).toBe(FileCategory.OTHER);
    expect(categorizeFile('assets/image.png', 'image.png')).toBe(FileCategory.OTHER);
  });

  it('handles files with no extension', () => {
    expect(categorizeFile('Makefile', 'Makefile')).toBe(FileCategory.OTHER);
    expect(categorizeFile('Dockerfile', 'Dockerfile')).toBe(FileCategory.DEPLOYMENT);
  });
});

describe('isIgnoredPath', () => {
  it('returns true for known ignored directories', () => {
    expect(isIgnoredPath('node_modules/pkg/index.js')).toBe(true);
    expect(isIgnoredPath('dist/bundle.js')).toBe(true);
    expect(isIgnoredPath('.git/objects/pack')).toBe(true);
    expect(isIgnoredPath('vendor/lib.js')).toBe(true);
  });

  it('returns false for non-ignored paths', () => {
    expect(isIgnoredPath('src/app.ts')).toBe(false);
    expect(isIgnoredPath('docs/readme.md')).toBe(false);
    expect(isIgnoredPath('package.json')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isIgnoredPath('Node_Modules/pkg/index.js')).toBe(true);
    expect(isIgnoredPath('DIST/bundle.js')).toBe(true);
  });
});

describe('isAuthLikePath', () => {
  it('returns true for auth/security directories', () => {
    expect(isAuthLikePath('auth/login.ts')).toBe(true);
    expect(isAuthLikePath('security/session.ts')).toBe(true);
    expect(isAuthLikePath('authentication/check.ts')).toBe(true);
  });

  it('returns true for auth-like filenames', () => {
    expect(isAuthLikePath('login.ts')).toBe(true);
    expect(isAuthLikePath('logout.ts')).toBe(true);
    expect(isAuthLikePath('session-manager.ts')).toBe(true);
    expect(isAuthLikePath('signup.ts')).toBe(true);
  });

  it('returns false for unrelated paths', () => {
    expect(isAuthLikePath('src/app.ts')).toBe(false);
    expect(isAuthLikePath('frontend/ui.ts')).toBe(false);
  });
});

describe('isBackendLikePath', () => {
  it('returns true for backend-like directories', () => {
    expect(isBackendLikePath('api/users.ts')).toBe(true);
    expect(isBackendLikePath('server/index.ts')).toBe(true);
    expect(isBackendLikePath('services/service.ts')).toBe(true);
    expect(isBackendLikePath('routes/handler.ts')).toBe(true);
  });

  it('returns false for non-backend paths', () => {
    expect(isBackendLikePath('frontend/App.tsx')).toBe(false);
  });
});

describe('isFrontendLikePath', () => {
  it('returns true for frontend-like directories', () => {
    expect(isFrontendLikePath('components/App.tsx')).toBe(true);
    expect(isFrontendLikePath('pages/ui.ts')).toBe(true);
    expect(isFrontendLikePath('views/dashboard.tsx')).toBe(true);
  });

  it('returns false for non-frontend paths', () => {
    expect(isFrontendLikePath('server/index.ts')).toBe(false);
    expect(isFrontendLikePath('database/migrations.sql')).toBe(false);
  });
});

describe('isDatabaseLikePath', () => {
  it('returns true for database-like directories', () => {
    expect(isDatabaseLikePath('db/schema.sql')).toBe(true);
    expect(isDatabaseLikePath('migrations/001.sql')).toBe(true);
    expect(isDatabaseLikePath('prisma/schema.prisma')).toBe(true);
  });

  it('returns false for non-database paths', () => {
    expect(isDatabaseLikePath('src/app.ts')).toBe(false);
  });
});

describe('isDeploymentLikePath', () => {
  it('returns true for deployment directories', () => {
    expect(isDeploymentLikePath('deploy/production.yml')).toBe(true);
    expect(isDeploymentLikePath('infra/main.tf')).toBe(true);
    expect(isDeploymentLikePath('.github/workflows/ci.yml')).toBe(true);
  });

  it('returns false for non-deployment paths', () => {
    expect(isDeploymentLikePath('src/index.ts')).toBe(false);
  });
});
