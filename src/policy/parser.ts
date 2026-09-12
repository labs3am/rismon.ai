/**
 * Rismon Policy Parser
 * 
 * Parses and validates .rismon.yml policy files.
 * Returns structured Policy objects or PolicyError on invalid input.
 */

import { parse as parseYaml } from 'yaml';
import {
  Policy,
  PolicyAction,
  PolicyRule,
  PolicyError,
  isPolicyAction,
} from './types';

/**
 * Supported policy format version.
 */
const SUPPORTED_VERSION = 1;

/**
 * Parses a .rismon.yml policy string into a validated Policy object.
 * 
 * @param content - The YAML content of the policy file
 * @returns A validated Policy object
 * @throws PolicyError if the policy is malformed or invalid
 */
export function parsePolicy(content: string): Policy {
  // Parse YAML
  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (error) {
    throw new PolicyError(
      `Invalid YAML: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  // Validate that we got an object
  if (raw === null || typeof raw !== 'object') {
    throw new PolicyError('Policy must be a YAML object');
  }

  const policy = raw as Record<string, unknown>;

  // Validate version
  if (!('version' in policy)) {
    throw new PolicyError('Missing required field: version');
  }

  if (policy.version !== SUPPORTED_VERSION) {
    throw new PolicyError(
      `Unsupported policy version: ${policy.version}. Supported version: ${SUPPORTED_VERSION}`
    );
  }

  // Validate rules exist
  if (!('rules' in policy)) {
    throw new PolicyError('Missing required field: rules');
  }

  if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
    throw new PolicyError('Policy must have at least one rule');
  }

  // Validate default action
  if (!('default' in policy)) {
    throw new PolicyError('Missing required field: default');
  }

  if (!isPolicyAction(policy.default)) {
    throw new PolicyError(
      `Invalid default action: "${policy.default}". Must be one of: allow, require_review, block`
    );
  }

  // Parse and validate each rule
  const rules: PolicyRule[] = policy.rules.map((rule, index) =>
    parseRule(rule, index)
  );

  return {
    version: SUPPORTED_VERSION,
    rules,
    default: policy.default,
  };
}

/**
 * Parses and validates a single policy rule.
 */
function parseRule(rule: unknown, index: number): PolicyRule {
  if (rule === null || typeof rule !== 'object') {
    throw new PolicyError(`Rule at index ${index} must be an object`);
  }

  const ruleObj = rule as Record<string, unknown>;

  // Validate name
  if (!('name' in ruleObj)) {
    throw new PolicyError(`Rule at index ${index} is missing required field: name`);
  }

  if (typeof ruleObj.name !== 'string' || ruleObj.name.trim() === '') {
    throw new PolicyError(`Rule at index ${index} must have a non-empty name`);
  }

  // Validate description
  if (!('description' in ruleObj)) {
    throw new PolicyError(`Rule "${ruleObj.name}" is missing required field: description`);
  }

  if (typeof ruleObj.description !== 'string') {
    throw new PolicyError(`Rule "${ruleObj.name}" description must be a string`);
  }

  // Validate paths
  if (!('paths' in ruleObj)) {
    throw new PolicyError(`Rule "${ruleObj.name}" is missing required field: paths`);
  }

  if (!Array.isArray(ruleObj.paths) || ruleObj.paths.length === 0) {
    throw new PolicyError(`Rule "${ruleObj.name}" must have at least one path`);
  }

  const paths: string[] = ruleObj.paths.map((path, pathIndex) => {
    if (typeof path !== 'string' || path.trim() === '') {
      throw new PolicyError(
        `Rule "${ruleObj.name}" path at index ${pathIndex} must be a non-empty string`
      );
    }
    return path;
  });

  // Validate action
  if (!('action' in ruleObj)) {
    throw new PolicyError(`Rule "${ruleObj.name}" is missing required field: action`);
  }

  if (!isPolicyAction(ruleObj.action)) {
    throw new PolicyError(
      `Rule "${ruleObj.name}" has invalid action: "${ruleObj.action}". Must be one of: allow, require_review, block`
    );
  }

  return {
    name: ruleObj.name,
    description: ruleObj.description,
    paths,
    action: ruleObj.action,
  };
}