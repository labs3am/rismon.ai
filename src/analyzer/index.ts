/**
 * Rismon Repository Analyzer
 *
 * Deterministic repository understanding: builds a structured inventory and
 * SUGGESTS areas a human may want to protect. Never makes authorization
 * decisions — the policy engine (src/policy) remains the final authority.
 *
 * Usage:
 * ```typescript
 * import { analyzeRepository, analyzeRepositorySafe } from '@/analyzer';
 *
 * const analysis = analyzeRepository('/path/to/repo');
 * console.log(analysis.areas.map(a => a.name));
 *
 * const outcome = analyzeRepositorySafe('/path/to/repo');
 * if (!outcome.ok) console.error(outcome.error);
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildInventory, isIgnoredPath } from './inventory';
import { DeterministicClassifier, type RepositoryClassifier } from './classifier';
import {
  type RepositoryAnalysis,
  type RepositoryInventory,
  type RepositoryArea,
  type RepositoryFile,
  FileCategory,
  AnalyzerError,
  type AnalyzeOutcome,
  ExitCode,
} from './types';

export type { RepositoryClassifier } from './classifier';
export { DeterministicClassifier } from './classifier';
export {
  DEFAULT_IGNORED_DIRS,
  buildInventory,
  categorizeFile,
  isIgnoredPath,
  isAuthLikePath,
  isBackendLikePath,
  isFrontendLikePath,
  isDatabaseLikePath,
  isDeploymentLikePath,
} from './inventory';
export type {
  RepositoryAnalysis,
  RepositoryArea,
  RepositoryFile,
  RepositoryInventory,
  FileCategory,
  AnalyzeOutcome,
} from './types';
export { AnalyzerError } from './types';

/**
 * Analyzes a repository and returns the complete structured analysis.
 * Throws AnalyzerError when the root path is invalid.
 *
 * @param rootPath - Absolute path to the repository root
 * @param classifier - Optional classifier override (defaults to deterministic)
 */
export function analyzeRepository(
  rootPath: string,
  classifier: RepositoryClassifier = new DeterministicClassifier()
): RepositoryAnalysis {
  const inventory = buildInventory(rootPath);
  const areas = classifier.classify(inventory);

  return {
    repositoryName: inventory.repositoryName,
    rootPath: inventory.rootPath,
    files: inventory.files,
    areas,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Analyzes a repository and returns a structured outcome (never throws).
 * Useful for CLI and future integrations.
 */
export function analyzeRepositorySafe(
  rootPath: string,
  classifier: RepositoryClassifier = new DeterministicClassifier()
): AnalyzeOutcome {
  try {
    const analysis = analyzeRepository(rootPath, classifier);
    return { ok: true, analysis, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message, exitCode: 3 };
  }
}