/**
 * Rismon Git Module
 * 
 * Provides Git repository discovery and change detection.
 * This module is separate from the policy engine and handles
 * all Git-specific operations.
 */

import { execSync } from 'child_process';
import { ChangedFile, FileStatus } from '@/policy/types';

/**
 * Error thrown when Git operations fail.
 */
export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Finds the root directory of the current Git repository.
 * 
 * @param cwd - The current working directory to start from
 * @returns The absolute path to the repository root
 * @throws GitError if not inside a Git repository
 */
export function findRepoRoot(cwd: string = process.cwd()): string {
  try {
    const result = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000,
      windowsHide: true,
    });
    return result.trim();
  } catch (error) {
    throw new GitError(
      'Not inside a Git repository. Please run this command from within a Git repository.'
    );
  }
}

/**
 * Checks if the current directory is inside a Git repository.
 * 
 * @param cwd - The current working directory to check
 * @returns True if inside a Git repository
 */
export function isGitRepository(cwd: string = process.cwd()): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the list of changed files in the working tree.
 * Includes both staged and unstaged changes.
 * 
 * @param cwd - The current working directory
 * @returns Array of changed files
 * @throws GitError if Git command fails
 */
export function getChangedFiles(cwd: string = process.cwd()): ChangedFile[] {
  try {
    const gitOpts = {
      cwd,
      encoding: 'utf-8' as const,
      stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
      timeout: 15000,
    };
    // Get staged changes
    const staged = execSync('git diff --cached --name-status', gitOpts);

    // Get unstaged changes
    const unstaged = execSync('git diff --name-status', gitOpts);

    // Get untracked files
    const untracked = execSync('git ls-files --others --exclude-standard', gitOpts);

    const files: ChangedFile[] = [];
    const seenPaths = new Set<string>();

    // Parse staged changes
    parseNameStatus(staged, true).forEach((file) => {
      files.push(file);
      seenPaths.add(file.path);
    });

    // Parse unstaged changes (skip if already seen as staged)
    parseNameStatus(unstaged, false).forEach((file) => {
      if (!seenPaths.has(file.path)) {
        files.push(file);
        seenPaths.add(file.path);
      }
    });

    // Parse untracked files
    parseUntracked(untracked).forEach((file) => {
      if (!seenPaths.has(file.path)) {
        files.push(file);
        seenPaths.add(file.path);
      }
    });

    return files;
  } catch (error) {
    throw new GitError(
      `Failed to get changed files: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Parses Git name-status output.
 * 
 * Git name-status format:
 * XY PATH
 * XY PATH1 PATH2 (for renames)
 * 
 * Where:
 * X = status of the index (staged)
 * Y = status of the working tree (unstaged)
 * 
 * Status codes:
 * A = Added
 * C = Copied
 * D = Deleted
 * M = Modified
 * R = Renamed
 * U = Updated but unmerged
 * 
 * @param output - The Git name-status output
 * @param isStaged - Whether this is staged output
 * @returns Array of changed files
 */
function parseNameStatus(output: string, isStaged: boolean): ChangedFile[] {
  const files: ChangedFile[] = [];
  const lines = output.split('\n').filter((line) => line.trim() !== '');

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const status = parts[0].trim();
    const path = parts[parts.length - 1];

    // Handle renames (R100 oldpath newpath)
    if (status.startsWith('R')) {
      if (parts.length >= 3) {
        const previousPath = parts[1];
        const newPath = parts[2];
        files.push({
          path: newPath,
          previousPath,
          status: FileStatus.RENAMED,
        });
      }
      continue;
    }

    // Map Git status to FileStatus
    const fileStatus = mapGitStatus(status);
    if (fileStatus) {
      files.push({
        path,
        status: fileStatus,
      });
    }
  }

  return files;
}

/**
 * Parses untracked files output.
 * 
 * @param output - The Git ls-files output
 * @returns Array of changed files with ADDED status
 */
function parseUntracked(output: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const lines = output.split('\n').filter((line) => line.trim() !== '');

  for (const line of lines) {
    files.push({
      path: line.trim(),
      status: FileStatus.ADDED,
    });
  }

  return files;
}

/**
 * Maps Git status code to FileStatus.
 * 
 * @param status - The Git status code
 * @returns The corresponding FileStatus, or null if unknown
 */
function mapGitStatus(status: string): FileStatus | null {
  // Take the first character (working tree status for unstaged, index for staged)
  const code = status[0]?.toUpperCase();

  switch (code) {
    case 'A':
      return FileStatus.ADDED;
    case 'C':
      return FileStatus.ADDED; // Copy is treated as add
    case 'D':
      return FileStatus.DELETED;
    case 'M':
      return FileStatus.MODIFIED;
    case 'R':
      return FileStatus.RENAMED;
    case 'U':
      return FileStatus.MODIFIED; // Updated but unmerged treated as modified
    default:
      return null;
  }
}