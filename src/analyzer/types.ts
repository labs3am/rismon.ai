/**
 * Rismon Repository Analyzer Types
 *
 * Structured inventory and area classification for a local repository.
 *
 * The analyzer is READ-ONLY: it never executes repository code, never reads
 * full file contents in v0.1, and never writes anything. It produces a
 * deterministic inventory plus SUGGESTED areas a human may want to protect.
 *
 * It never makes authorization decisions. The policy engine
 * (src/policy) remains the final enforcement authority.
 */

/**
 * Broad file categories derived from paths, extensions, and known filenames.
 * Deterministic — same input always yields the same category.
 */
export enum FileCategory {
  SOURCE = 'source',
  CONFIG = 'config',
  MANIFEST = 'manifest',
  DEPLOYMENT = 'deployment',
  TEST = 'test',
  DOC = 'doc',
  DATABASE = 'database',
  OTHER = 'other',
}

/**
 * A single file in the repository inventory.
 * `path` is repo-relative with forward slashes.
 */
export interface RepositoryFile {
  /** Repository-relative path, forward slashes, no leading './' */
  path: string;
  /** Base filename (e.g. 'package.json') */
  name: string;
  /** Lowercase extension without the dot ('' when the file has none) */
  extension: string;
  /** File size in bytes (from stat, content is never read) */
  size: number;
  /** Broad deterministic category */
  category: FileCategory;
}

/**
 * A suggested area of the repository a human may want to protect.
 * Suggestions only — the human decides the final policy.
 */
export interface RepositoryArea {
  /** Stable machine id, e.g. 'auth-security', 'deployment-infra' */
  id: string;
  /** Human-readable area name */
  name: string;
  /** Why this area matters / what the evidence suggests */
  description: string;
  /**
   * Real repo-relative paths or real-directory glob patterns
   * (e.g. ['src/auth/**', 'package.json']). Never invented paths.
   */
  paths: string[];
  /** Confidence between 0 and 1 (deterministic tier-based value) */
  confidence: number;
  /** Deterministic evidence strings describing what was matched */
  signals: string[];
}

/**
 * Complete structured analysis of a repository.
 */
export interface RepositoryAnalysis {
  /** Basename of the repository root (e.g. 'rismon.ai') */
  repositoryName: string;
  /** Absolute path to the repository root */
  rootPath: string;
  /** All inventoried files (ignored/generated dirs are excluded) */
  files: RepositoryFile[];
  /** Evidence-backed suggested areas (may be empty) */
  areas: RepositoryArea[];
  /** ISO timestamp of when the analysis was produced */
  analyzedAt: string;
}

/**
 * Structured inventory produced before classification.
 * Exposed so a future AI classifier can consume the same shape.
 */
export interface RepositoryInventory {
  repositoryName: string;
  rootPath: string;
  files: RepositoryFile[];
  /** Directories that were skipped by the ignore list (repo-relative) */
  ignoredDirs: string[];
}

/**
 * Error thrown when the analyzer cannot inspect a repository.
 */
export class AnalyzerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyzerError';
  }
}

/**
 * Exit codes for the analyze command.
 */
export enum ExitCode {
  /**
   * Success — analysis produced without errors.
   */
  SUCCESS = 0,
  /**
   * Error — could not analyze (invalid path, not a directory, etc.).
   */
  ERROR = 3,
}

/**
 * Structured outcome for the analyzer (mirrors CheckOutcome in src/cli).
 */
export type AnalyzeSuccess = {
  ok: true;
  analysis: RepositoryAnalysis;
  exitCode: number;
};

export type AnalyzeFailure = {
  ok: false;
  error: string;
  exitCode: number;
};

export type AnalyzeOutcome = AnalyzeSuccess | AnalyzeFailure;