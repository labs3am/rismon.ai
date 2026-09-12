/**
 * Rismon Policy Engine Types
 * 
 * This module defines all types for the deterministic policy engine.
 * The engine evaluates repository changes against policies to produce
 * deterministic decisions: ALLOW, REQUIRE_REVIEW, or BLOCK.
 */

/**
 * Supported policy actions.
 * Ordered by strength: ALLOW < REQUIRE_REVIEW < BLOCK
 */
export enum PolicyAction {
  ALLOW = 'allow',
  REQUIRE_REVIEW = 'require_review',
  BLOCK = 'block',
}

/**
 * Strength ordering for policy actions.
 * Higher values indicate stronger (more restrictive) actions.
 */
export const ACTION_STRENGTH: Record<PolicyAction, number> = {
  [PolicyAction.ALLOW]: 0,
  [PolicyAction.REQUIRE_REVIEW]: 1,
  [PolicyAction.BLOCK]: 2,
};

/**
 * Supported file change statuses.
 */
export enum FileStatus {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed',
}

/**
 * Represents a changed file in a repository.
 * Generic type that can be used with any version control system.
 */
export interface ChangedFile {
  /** Repository-relative path to the file */
  path: string;
  /** Status of the change */
  status: FileStatus;
  /** Previous path for renamed files */
  previousPath?: string;
}

/**
 * Represents a single policy rule.
 */
export interface PolicyRule {
  /** Unique name for the rule */
  name: string;
  /** Human-readable description of the rule */
  description: string;
  /** Glob patterns to match file paths against */
  paths: string[];
  /** Action to take when this rule matches */
  action: PolicyAction;
}

/**
 * Represents a complete Rismon policy.
 */
export interface Policy {
  /** Policy format version */
  version: number;
  /** List of rules to evaluate */
  rules: PolicyRule[];
  /** Default action for files that don't match any rule */
  default: PolicyAction;
}

/**
 * Represents a single match between a changed file and a policy rule.
 */
export interface PolicyMatch {
  /** The path that was matched (may be the current or previous path for renames) */
  file: string;
  /** Name of the rule that matched */
  rule: string;
  /** Action required by the matched rule */
  action: PolicyAction;
  /** Human-readable reason for the match */
  reason: string;
}

/**
 * Result of evaluating a set of changed files against a policy.
 */
export interface PolicyResult {
  /** The overall decision */
  decision: PolicyAction;
  /** List of all matches found */
  matches: PolicyMatch[];
}

/**
 * Policy validation error.
 * Returned when a policy file is malformed or invalid.
 */
export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyError';
  }
}

/**
 * Type guard to check if a value is a valid PolicyAction.
 */
export function isPolicyAction(value: unknown): value is PolicyAction {
  return (
    typeof value === 'string' &&
    Object.values(PolicyAction).includes(value as PolicyAction)
  );
}

/**
 * Type guard to check if a value is a valid FileStatus.
 */
export function isFileStatus(value: unknown): value is FileStatus {
  return (
    typeof value === 'string' &&
    Object.values(FileStatus).includes(value as FileStatus)
  );
}

/**
 * Returns the stronger of two policy actions.
 * If both have equal strength, returns the first action.
 */
export function strongerAction(a: PolicyAction, b: PolicyAction): PolicyAction {
  return ACTION_STRENGTH[a] >= ACTION_STRENGTH[b] ? a : b;
}

/**
 * Returns the strongest action from a list of actions.
 * Returns ALLOW if the list is empty.
 */
export function strongestAction(actions: PolicyAction[]): PolicyAction {
  if (actions.length === 0) {
    return PolicyAction.ALLOW;
  }
  return actions.reduce((strongest, current) => strongerAction(strongest, current));
}