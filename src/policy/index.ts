/**
 * Rismon Policy Engine
 * 
 * A deterministic policy engine for evaluating repository changes against policies.
 * 
 * Usage:
 * ```typescript
 * import { parsePolicy, evaluatePolicy } from '@/policy';
 * 
 * const policy = parsePolicy(yamlContent);
 * const result = evaluatePolicy(policy, changedFiles);
 * 
 * console.log(result.decision); // 'allow', 'require_review', or 'block'
 * console.log(result.matches);  // Details of all matches
 * ```
 */

// Types (values)
export {
  PolicyAction,
  ACTION_STRENGTH,
  FileStatus,
  PolicyError,
  isPolicyAction,
  isFileStatus,
  strongerAction,
  strongestAction,
} from './types';

// Types (type-only, requires `export type` under isolatedModules)
export type {
  ChangedFile,
  PolicyRule,
  Policy,
  PolicyMatch,
  PolicyResult,
} from './types';

// Parser
export { parsePolicy } from './parser';

// Matcher
export { normalizePath, matchesGlob, findMatchingRules, getMatchedPath } from './matcher';

// Evaluator
export { evaluatePolicy, evaluateFile, evaluateFilePath } from './evaluator';

// Policy Builder
export {
  buildPolicy,
  buildPolicyFromAnalysis,
  generatePolicyYaml,
  getDefaultAction,
  getDefaultActions,
  validateSelections,
  DEFAULT_AREA_ACTIONS,
  FALLBACK_ACTION,
} from './builder';

// Policy Builder types
export type {
  PolicySelections,
  AreaAction,
  PolicyBuildResult,
} from './builder';