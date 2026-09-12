import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runCheck, main, ExitCode, type CheckOutcome } from '@/cli';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

function isSuccess(outcome: CheckOutcome): outcome is Extract<CheckOutcome, { ok: true }> {
  return outcome.ok === true;
}

function isFailure(outcome: CheckOutcome): outcome is Extract<CheckOutcome, { ok: false }> {
  return outcome.ok === false;
}

const samplePolicy = `version: 1
rules:
  - name: protect-auth
    description: "Authentication changes require review"
    paths:
      - "src/auth/**"
    action: require_review
  - name: protect-production
    description: "Production infrastructure is locked"
    paths:
      - ".github/workflows/**"
    action: block
  - name: frontend-allow
    description: "Frontend changes are allowed"
    paths:
      - "src/components/**"
    action: allow
default: require_review
`;

let tempDirs: string[] = [];

function createTempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rismon-cli-test-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

function createFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function createTrackedFile(dir: string, relPath: string, content: string): void {
  createFile(path.join(dir, relPath), content);
  execSync(`git add ${JSON.stringify(relPath)}`, { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "add file"', { cwd: dir, stdio: 'pipe' });
}

/**
 * Executes the CLI `main` entry point for a directory while capturing output.
 * Passes the directory explicitly so tests never call process.chdir().
 */
async function mainFromDir(dir: string, args: string[]) {
  const logs: string[] = [];
  const errors: string[] = [];
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...logArgs: unknown[]) => {
    logs.push(logArgs.join(' '));
  });
  const errorSpy = vi.spyOn(console, 'error').mockImplementation((...errorArgs: unknown[]) => {
    errors.push(errorArgs.join(' '));
  });
  try {
    const exitCode = await main(args, dir);
    return { exitCode, logs, errors };
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  tempDirs = [];
});

describe('CLI runCheck', () => {
  describe('exit codes', () => {
    it('returns ALLOW for allowed changes', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/components/Button.tsx'), 'export const x = 1;');
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.ok).toBe(true);
      expect(outcome.exitCode).toBe(ExitCode.ALLOW);
    });

    it('returns ALLOW for a clean repository', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      const outcome = await runCheck(tempDir, { json: false });
      expect(isSuccess(outcome)).toBe(true);
      expect(outcome.exitCode).toBe(ExitCode.ALLOW);
      if (isSuccess(outcome)) { expect(outcome.changedFiles).toHaveLength(0); }
    });

    it('returns REQUIRE_REVIEW for review-required changes', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/auth/session.ts'), 'export const x = 1;');
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.exitCode).toBe(ExitCode.REQUIRE_REVIEW);
    });

    it('returns REQUIRE_REVIEW for a modified sensitive file', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createTrackedFile(tempDir, 'src/auth/session.ts', 'before');
      createFile(path.join(tempDir, 'src/auth/session.ts'), 'after');
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.exitCode).toBe(ExitCode.REQUIRE_REVIEW);
    });

    it('returns BLOCK for blocked changes', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, '.github/workflows/deploy.yml'), 'name: deploy');
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.exitCode).toBe(ExitCode.BLOCK);
    });

    it('returns BLOCK when any changed file is blocked', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/components/Button.tsx'), 'export const x = 1;');
      createFile(path.join(tempDir, 'src/auth/session.ts'), 'export const x = 1;');
      createFile(path.join(tempDir, '.github/workflows/deploy.yml'), 'name: deploy');
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.exitCode).toBe(ExitCode.BLOCK);
    });

    it('uses the default action for unmatched files', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'README-unmatched.md'), '# docs');
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.exitCode).toBe(ExitCode.REQUIRE_REVIEW);
    });

    it('returns BLOCK for a deleted protected file', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createTrackedFile(tempDir, '.github/workflows/deploy.yml', 'name: deploy');
      fs.unlinkSync(path.join(tempDir, '.github/workflows/deploy.yml'));
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.exitCode).toBe(ExitCode.BLOCK);
    });

    it('returns BLOCK for a renamed protected file', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createTrackedFile(tempDir, '.github/workflows/deploy.yml', 'name: deploy');
      fs.renameSync(
        path.join(tempDir, '.github/workflows/deploy.yml'),
        path.join(tempDir, '.github/workflows/deploy-new.yml')
      );
      execSync('git add .github/workflows/deploy.yml .github/workflows/deploy-new.yml', {
        cwd: tempDir,
        stdio: 'pipe',
      });
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.exitCode).toBe(ExitCode.BLOCK);
    });

    it('returns an error result for missing policy', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.ok).toBe(false);
      expect(outcome.exitCode).toBe(ExitCode.ERROR);
      if (isFailure(outcome)) expect(outcome.error).toContain('No policy file found');
    });

    it('returns an error result for an invalid policy', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), 'version: 1\ndefault: nope\nrules: []\n');
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.ok).toBe(false);
      expect(outcome.exitCode).toBe(ExitCode.ERROR);
      if (isFailure(outcome)) expect(outcome.error.length).toBeGreaterThan(0);
    });

    it('returns an error result outside a Git repository', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rismon-cli-outside-'));
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      const outcome = await runCheck(tempDir, { json: false });
      expect(outcome.ok).toBe(false);
      expect(outcome.exitCode).toBe(ExitCode.ERROR);
      if (isFailure(outcome)) expect(outcome.error).toContain('Git repository');
    });

    it('excludes the policy file itself from changed files', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy + '\n# modified\n');
      const outcome = await runCheck(tempDir, { json: false });
      expect(isSuccess(outcome)).toBe(true);
      if (isSuccess(outcome)) expect(outcome.changedFiles).toHaveLength(0);
    });
  });
});

describe('CLI main', () => {
  describe('exit codes', () => {
    it('accepts bare invocation for backwards compatibility', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/components/Button.tsx'), 'export const x = 1;');
      const outcome = await mainFromDir(tempDir, []);
      expect(outcome.exitCode).toBe(ExitCode.ALLOW);
    });

    it('rejects an unknown command', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      const outcome = await mainFromDir(tempDir, ['unknown-command']);
      expect(outcome.exitCode).toBe(ExitCode.ERROR);
      expect(outcome.errors.join('\n')).toContain('rismon check');
    });

    it('returns ALLOW for allowed changes with human-readable output', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/components/Button.tsx'), 'export const x = 1;');
      const outcome = await mainFromDir(tempDir, ['check']);
      expect(outcome.exitCode).toBe(ExitCode.ALLOW);
      expect(outcome.logs.join('\n')).toContain('Decision: ALLOWED');
    });

    it('returns ALLOW for a clean repository with human-readable output', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      const outcome = await mainFromDir(tempDir, ['check']);
      expect(outcome.exitCode).toBe(ExitCode.ALLOW);
      expect(outcome.logs.join('\n')).toContain('No changes detected.');
    });

    it('returns REQUIRE_REVIEW via main', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/auth/session.ts'), 'export const x = 1;');
      const outcome = await mainFromDir(tempDir, ['check']);
      expect(outcome.exitCode).toBe(ExitCode.REQUIRE_REVIEW);
      expect(outcome.logs.join('\n')).toContain('Decision: REVIEW REQUIRED');
    });

    it('returns BLOCK via main', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, '.github/workflows/deploy.yml'), 'name: deploy');
      const outcome = await mainFromDir(tempDir, ['check']);
      expect(outcome.exitCode).toBe(ExitCode.BLOCK);
      expect(outcome.logs.join('\n')).toContain('Decision: BLOCK');
    });

    it('returns an error for a missing policy with a clear message', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      const outcome = await mainFromDir(tempDir, ['check']);
      expect(outcome.exitCode).toBe(ExitCode.ERROR);
      expect(outcome.errors.join('\n')).toContain('No policy file found');
    });
  });

  describe('human-readable output', () => {
    it('prints each changed file with its action and rule', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/components/Button.tsx'), 'export const x = 1;');
      createFile(path.join(tempDir, 'src/auth/session.ts'), 'export const x = 1;');
      const outcome = await mainFromDir(tempDir, ['check']);
      const output = outcome.logs.join('\n');
      expect(output).toContain('Rismon Policy Check');
      expect(output).toContain('src/components/Button.tsx');
      expect(output).toContain('src/auth/session.ts');
      expect(output).toContain('Rule: protect-auth');
      expect(output).toContain('Rule: frontend-allow');
      expect(output).toContain('Decision: REVIEW REQUIRED');
    });
  });

  describe('JSON output', () => {
    it('outputs valid JSON with decision, matches, and files', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, 'src/components/Button.tsx'), 'export const x = 1;');
      const outcome = await mainFromDir(tempDir, ['check', '--json']);
      expect(outcome.exitCode).toBe(ExitCode.ALLOW);
      const parsed = JSON.parse(outcome.logs.join('\n'));
      expect(parsed.decision).toBe('allow');
      expect(parsed.matches).toBeInstanceOf(Array);
      expect(parsed.files).toBeInstanceOf(Array);
      expect(parsed.files).toHaveLength(1);
      expect(parsed.files[0].path).toBe('src/components/Button.tsx');
    });

    it('outputs JSON for blocked changes without decorations', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      createFile(path.join(tempDir, '.rismon.yml'), samplePolicy);
      createFile(path.join(tempDir, '.github/workflows/deploy.yml'), 'name: deploy');
      const outcome = await mainFromDir(tempDir, ['check', '--json']);
      expect(outcome.exitCode).toBe(ExitCode.BLOCK);
      const output = outcome.logs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.decision).toBe('block');
      expect(parsed.matches[0].rule).toBe('protect-production');
      expect(output).not.toContain('Rismon Policy Check');
    });

    it('returns a JSON error when the policy is missing', async () => {
      const tempDir = createTempRepo();
      tempDirs.push(tempDir);
      const outcome = await mainFromDir(tempDir, ['check', '--json']);
      expect(outcome.exitCode).toBe(ExitCode.ERROR);
      const parsed = JSON.parse(outcome.errors.join('\n'));
      expect(parsed.error).toContain('No policy file found');
    });
  });
});