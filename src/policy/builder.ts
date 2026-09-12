/**
 * Rismon Policy Builder
 *
 * Turns a RepositoryAnalysis into a valid .rismon.yml policy.
 *
 * The owner is the authority. Defaults are deterministic suggestions only —
 * never security guarantees. Every default can be overridden.
 *
 * No AI, no external services, no network calls. Pure deterministic logic.
 */

import {
  Policy,
  PolicyAction,
  PolicyRule,
  PolicyError,
} from './types';
import type { RepositoryAnalysis, RepositoryArea } from '../analyzer';

/**
 * Maps analyzer area IDs to default policy actions.
 * These are starting suggestions only. The owner always has the final say.
 */
const DEFAULT_AREA_ACTIONS: Record<string, PolicyAction> = {
  documentation: PolicyAction.ALLOW,
  tests: PolicyAction.ALLOW,
  frontend: PolicyAction.ALLOW,
  configuration: PolicyAction.REQUIRE_REVIEW,
  dependencies: PolicyAction.REQUIRE_REVIEW,
  'core-logic': PolicyAction.REQUIRE_REVIEW,
  database: PolicyAction.REQUIRE_REVIEW,
  'auth-security': PolicyAction.REQUIRE_REVIEW,
  'deployment-infra': PolicyAction.BLOCK,
};

/** Fallback action for any area not explicitly mapped. */
const FALLBACK_ACTION = PolicyAction.REQUIRE_REVIEW;

/** Owner selections keyed by area ID. */
export type PolicySelections = Record<string, PolicyAction>;

/** A single area with its default action. */
export interface AreaAction {
  area: RepositoryArea;
  defaultAction: PolicyAction;
}

/** Result of building a policy from an analysis. */
export interface PolicyBuildResult {
  policy: Policy;
  yaml: string;
  areaActions: AreaAction[];
}

/** Resolves the default action for an area based on its ID. */
export function getDefaultAction(areaId: string): PolicyAction {
  return DEFAULT_AREA_ACTIONS[areaId] ?? FALLBACK_ACTION;
}

/** Returns the default actions for all areas in an analysis. */
export function getDefaultActions(analysis: RepositoryAnalysis): AreaAction[] {
  return analysis.areas.map((area) => ({
    area,
    defaultAction: getDefaultAction(area.id),
  }));
}

/** Builds a single policy rule from an area and an action. */
function buildRule(area: RepositoryArea, action: PolicyAction): PolicyRule {
  return {
    name: `area-${area.id}`,
    description: area.description,
    paths: area.paths,
    action,
  };
}

/** Validates that a PolicySelections object contains only valid actions. */
export function validateSelections(selections: unknown): PolicySelections {
  if (selections === null || selections === undefined) {
    return {};
  }
  if (typeof selections !== 'object') {
    throw new PolicyError('Selections must be an object mapping area IDs to actions');
  }
  const result: PolicySelections = {};
  for (const [areaId, action] of Object.entries(selections as Record<string, unknown>)) {
    if (!Object.values(PolicyAction).includes(action as PolicyAction)) {
      throw new PolicyError(
        `Invalid action "${action}" for area "${areaId}". Must be one of: allow, require_review, block`
      );
    }
    result[areaId] = action as PolicyAction;
  }
  return result;
}

/** Builds a Policy from a RepositoryAnalysis. */
export function buildPolicyFromAnalysis(
  analysis: RepositoryAnalysis,
  selections: PolicySelections = {}
): Policy {
  if (!analysis || !Array.isArray(analysis.areas)) {
    throw new PolicyError('Invalid analysis: must contain an areas array');
  }
  const validatedSelections = validateSelections(selections);
  const rules: PolicyRule[] = [];
  for (const area of analysis.areas) {
    const action = validatedSelections[area.id] ?? getDefaultAction(area.id);
    rules.push(buildRule(area, action));
  }
  return {
    version: 1,
    rules,
    default: PolicyAction.REQUIRE_REVIEW,
  };
}

/** Builds a Policy and generates the YAML string in one call. */
export function buildPolicy(
  analysis: RepositoryAnalysis,
  selections: PolicySelections = {}
): PolicyBuildResult {
  const policy = buildPolicyFromAnalysis(analysis, selections);
  const areaActions = analysis.areas.map((area) => ({
    area,
    defaultAction: selections[area.id] ?? getDefaultAction(area.id),
  }));
  return {
    policy,
    yaml: generatePolicyYaml(policy),
    areaActions,
  };
}

/** Generates a valid .rismon.yml string from a Policy object. */
export function generatePolicyYaml(policy: Policy): string {
  const lines: string[] = [];
  lines.push(`version: ${policy.version}`);
  lines.push('');
  lines.push('rules:');
  for (const rule of policy.rules) {
    lines.push(`  - name: ${yamlEscape(rule.name)}`);
    lines.push(`    description: ${yamlEscape(rule.description)}`);
    lines.push(`    paths:`);
    for (const rulePath of rule.paths) {
      lines.push(`      - ${yamlEscape(rulePath)}`);
    }
    lines.push(`    action: ${rule.action}`);
  }
  lines.push('');
  lines.push(`default: ${policy.default}`);
  return lines.join('\n') + '\n';
}

/** Escapes a string for safe inclusion as a YAML scalar. */
function yamlEscape(value: string): string {
  if (value === '') return '""';
  if (/[:#\[\]{}!&*?|>'"%@`]/.test(value) || value.startsWith(' ') || value.endsWith(' ') || /^[\-?:,]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}