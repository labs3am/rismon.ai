/**
 * Rismon Policy Matcher
 * 
 * Matches changed files against policy rules using glob patterns.
 * Handles path normalization and glob matching.
 */

import minimatch from 'minimatch';
import { PolicyRule, ChangedFile, FileStatus } from './types';

/**
 * Normalizes a repository path for consistent matching.
 * 
 * - Uses '/' as separator
 * - Removes leading './'
 * - Normalizes redundant path separators
 * - Removes leading '/'
 * 
 * @param path - The path to normalize
 * @returns The normalized path
 */
export function normalizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  // Replace backslashes with forward slashes
  let normalized = path.replace(/\\/g, '/');

  // Remove leading ./ or .\
  normalized = normalized.replace(/^\.\//, '');

  // Remove leading /
  normalized = normalized.replace(/^\//, '');

  // Normalize redundant path separators (e.g., // -> /)
  normalized = normalized.replace(/\/+/g, '/');

  // Remove trailing slash (except for root)
  if (normalized.length > 1) {
    normalized = normalized.replace(/\/$/, '');
  }

  return normalized;
}

/**
 * Checks if a file path matches a glob pattern.
 * 
 * @param path - The normalized file path
 * @param pattern - The glob pattern
 * @returns True if the path matches the pattern
 */
export function matchesGlob(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);

  // Use minimatch for glob matching
  return minimatch(normalizedPath, normalizedPattern);
}

/**
 * Finds all rules that match a given changed file.
 * 
 * For renamed files, both the old and new paths are checked.
 * 
 * @param file - The changed file
 * @param rules - The policy rules to check against
 * @returns Array of matching rules
 */
export function findMatchingRules(
  file: ChangedFile,
  rules: PolicyRule[]
): PolicyRule[] {
  const matchingRules: PolicyRule[] = [];

  // Collect all paths to check (current path and previous path for renames)
  const pathsToCheck: string[] = [file.path];
  if (file.status === FileStatus.RENAMED && file.previousPath) {
    pathsToCheck.push(file.previousPath);
  }

  for (const rule of rules) {
    // Check if any of the file's paths match any of the rule's patterns
    const isMatch = pathsToCheck.some((filePath) =>
      rule.paths.some((pattern) => matchesGlob(filePath, pattern))
    );

    if (isMatch) {
      matchingRules.push(rule);
    }
  }

  return matchingRules;
}

/**
 * Gets the matched path for a file against a rule.
 * Returns the specific path that matched (useful for renamed files).
 * 
 * @param file - The changed file
 * @param rule - The policy rule
 * @returns The matched path, or null if no match
 */
export function getMatchedPath(file: ChangedFile, rule: PolicyRule): string | null {
  const pathsToCheck: { path: string; isPrevious: boolean }[] = [
    { path: file.path, isPrevious: false },
  ];

  if (file.status === FileStatus.RENAMED && file.previousPath) {
    pathsToCheck.push({ path: file.previousPath, isPrevious: true });
  }

  for (const { path } of pathsToCheck) {
    const isMatch = rule.paths.some((pattern) => matchesGlob(path, pattern));
    if (isMatch) {
      return path;
    }
  }

  return null;
}