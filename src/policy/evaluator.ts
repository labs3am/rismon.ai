/**
 * Rismon Policy Evaluator
 * 
 * Evaluates changed files against a policy to produce deterministic decisions.
 * The same policy + same changed files always produce the same result.
 */

import {
  Policy,
  PolicyAction,
  PolicyResult,
  PolicyMatch,
  ChangedFile,
  FileStatus,
  strongerAction,
} from './types';
import { findMatchingRules, getMatchedPath } from './matcher';

/**
 * Evaluates a set of changed files against a policy.
 * 
 * For each changed file:
 * 1. Find all matching rules
 * 2. Take the strongest action from matching rules
 * 3. If no rules match, use the policy's default action
 * 
 * The overall decision is the strongest action across all files.
 * 
 * @param policy - The policy to evaluate against
 * @param changedFiles - The list of changed files
 * @returns A PolicyResult with the decision and all matches
 */
export function evaluatePolicy(
  policy: Policy,
  changedFiles: ChangedFile[]
): PolicyResult {
  const matches: PolicyMatch[] = [];
  const actions: PolicyAction[] = [];

  for (const file of changedFiles) {
    const fileMatches = evaluateFile(file, policy);
    matches.push(...fileMatches);
    fileMatches.forEach((match) => actions.push(match.action));
  }

  // Determine overall decision (strongest action wins)
  const decision = actions.length > 0
    ? actions.reduce((strongest, current) => strongerAction(strongest, current))
    : PolicyAction.ALLOW;

  return {
    decision,
    matches,
  };
}

/**
 * Evaluates a single changed file against a policy.
 * 
 * @param file - The changed file
 * @param policy - The policy to evaluate against
 * @returns Array of policy matches for this file
 */
export function evaluateFile(
  file: ChangedFile,
  policy: Policy
): PolicyMatch[] {
  const matches: PolicyMatch[] = [];

  // Find all rules that match this file
  const matchingRules = findMatchingRules(file, policy.rules);

  if (matchingRules.length === 0) {
    // No rules matched - use default action
    matches.push({
      file: file.path,
      rule: '(default)',
      action: policy.default,
      reason: `No matching rule found. Using policy default: ${policy.default}`,
    });
  } else {
    // Get the strongest action from all matching rules
    const strongestAction = matchingRules.reduce<PolicyAction>(
      (strongest, rule) => strongerAction(strongest, rule.action),
      PolicyAction.ALLOW
    );

    // Find the rule(s) with the strongest action
    const strongestRules = matchingRules.filter(
      (rule) => rule.action === strongestAction
    );

    // Use the first strongest rule for the match
    const matchedRule = strongestRules[0];
    const matchedPath = getMatchedPath(file, matchedRule) || file.path;

    matches.push({
      file: matchedPath,
      rule: matchedRule.name,
      action: matchedRule.action,
      reason: matchedRule.description,
    });
  }

  return matches;
}

/**
 * Convenience function to evaluate a single file path against a policy.
 * Useful for testing and simple use cases.
 * 
 * @param policy - The policy to evaluate against
 * @param filePath - The file path to check
 * @param status - The file status (defaults to MODIFIED)
 * @returns The policy action for this file
 */
export function evaluateFilePath(
  policy: Policy,
  filePath: string,
  status: FileStatus = FileStatus.MODIFIED
): PolicyAction {
  const result = evaluatePolicy(policy, [{ path: filePath, status }]);
  return result.decision;
}