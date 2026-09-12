import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { findRepoRoot, isGitRepository, getChangedFiles, GitError } from '@/git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Git Module', () => {
  describe('findRepoRoot', () => {
    it('should find the repository root', () => {
      const root = findRepoRoot();
      expect(root).toBeTruthy();
      expect(path.isAbsolute(root)).toBe(true);
    });

    it('should throw GitError when not in a repository', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rismon-test-'));
      expect(() => findRepoRoot(tempDir)).toThrow(GitError);
      fs.rmdirSync(tempDir);
    });
  });

  describe('isGitRepository', () => {
    it('should return true inside a repository', () => {
      expect(isGitRepository()).toBe(true);
    });

    it('should return false outside a repository', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rismon-test-'));
      expect(isGitRepository(tempDir)).toBe(false);
      fs.rmdirSync(tempDir);
    });
  });

  describe('getChangedFiles', () => {
    let tempDir: string;

    beforeAll(() => {
      // Create a temporary Git repository
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rismon-git-test-'));
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@example.com"', { cwd: tempDir });
      execSync('git config user.name "Test User"', { cwd: tempDir });

      // Create initial commit
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
      execSync('git add README.md', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });
    });

    afterAll(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return empty array for clean repository', () => {
      const files = getChangedFiles(tempDir);
      expect(files).toEqual([]);
    });

    it('should detect added files', () => {
      fs.writeFileSync(path.join(tempDir, 'new-file.ts'), 'export const x = 1;');
      const files = getChangedFiles(tempDir);
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('new-file.ts');
      expect(files[0].status).toBe('added');
    });

    it('should detect modified files', () => {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Modified');
      const files = getChangedFiles(tempDir);
      const readmeFile = files.find((f) => f.path === 'README.md');
      expect(readmeFile).toBeTruthy();
      expect(readmeFile?.status).toBe('modified');
    });

    it('should detect deleted files', () => {
      // Create a file, commit it, then delete it
      fs.writeFileSync(path.join(tempDir, 'to-delete.ts'), 'export const x = 1;');
      execSync('git add to-delete.ts', { cwd: tempDir });
      execSync('git commit -m "Add file to delete"', { cwd: tempDir });

      // Delete the file
      fs.unlinkSync(path.join(tempDir, 'to-delete.ts'));

      const files = getChangedFiles(tempDir);
      const deletedFile = files.find((f) => f.path === 'to-delete.ts');
      expect(deletedFile).toBeTruthy();
      expect(deletedFile?.status).toBe('deleted');
    });

    it('should detect renamed files', () => {
      // Create a file and commit it
      fs.writeFileSync(path.join(tempDir, 'old-name.ts'), 'export const y = 2;');
      execSync('git add old-name.ts', { cwd: tempDir });
      execSync('git commit -m "Add old-name"', { cwd: tempDir });

      // Rename it
      fs.renameSync(path.join(tempDir, 'old-name.ts'), path.join(tempDir, 'new-name.ts'));
      execSync('git add old-name.ts new-name.ts', { cwd: tempDir });

      const files = getChangedFiles(tempDir);
      const renamedFile = files.find((f) => f.path === 'new-name.ts');
      expect(renamedFile).toBeTruthy();
      expect(renamedFile?.status).toBe('renamed');
      expect(renamedFile?.previousPath).toBe('old-name.ts');
    });

    it('should detect multiple changed files', () => {
      fs.writeFileSync(path.join(tempDir, 'file1.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(tempDir, 'file2.ts'), 'export const b = 2;');
      const files = getChangedFiles(tempDir);
      expect(files.length).toBeGreaterThanOrEqual(2);
    });
  });
});