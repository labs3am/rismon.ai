import { describe, it, expect } from 'vitest';
import { parsePolicy } from '@/policy/parser';
import { PolicyAction, PolicyError } from '@/policy/types';

describe('parsePolicy', () => {
  describe('valid policies', () => {
    it('should parse a minimal valid policy', () => {
      const yaml = `
version: 1
rules:
  - name: test-rule
    description: "A test rule"
    paths:
      - "src/**"
    action: allow
default: require_review
`;
      const policy = parsePolicy(yaml);
      expect(policy.version).toBe(1);
      expect(policy.rules).toHaveLength(1);
      expect(policy.rules[0].name).toBe('test-rule');
      expect(policy.rules[0].action).toBe(PolicyAction.ALLOW);
      expect(policy.default).toBe(PolicyAction.REQUIRE_REVIEW);
    });

    it('should parse a policy with multiple rules', () => {
      const yaml = `
version: 1
rules:
  - name: rule-1
    description: "First rule"
    paths:
      - "src/auth/**"
    action: require_review
  - name: rule-2
    description: "Second rule"
    paths:
      - "src/payments/**"
    action: block
default: allow
`;
      const policy = parsePolicy(yaml);
      expect(policy.rules).toHaveLength(2);
      expect(policy.rules[0].name).toBe('rule-1');
      expect(policy.rules[1].name).toBe('rule-2');
    });

    it('should parse a rule with multiple paths', () => {
      const yaml = `
version: 1
rules:
  - name: multi-path
    description: "Multiple paths"
    paths:
      - "src/auth/**"
      - "src/middleware/**"
      - "lib/auth*"
    action: block
default: allow
`;
      const policy = parsePolicy(yaml);
      expect(policy.rules[0].paths).toHaveLength(3);
    });

    it('should parse all valid actions', () => {
      const yaml = `
version: 1
rules:
  - name: allow-rule
    description: "Allow"
    paths: ["src/**"]
    action: allow
  - name: review-rule
    description: "Review"
    paths: ["src/**"]
    action: require_review
  - name: block-rule
    description: "Block"
    paths: ["src/**"]
    action: block
default: allow
`;
      const policy = parsePolicy(yaml);
      expect(policy.rules[0].action).toBe(PolicyAction.ALLOW);
      expect(policy.rules[1].action).toBe(PolicyAction.REQUIRE_REVIEW);
      expect(policy.rules[2].action).toBe(PolicyAction.BLOCK);
    });
  });

  describe('invalid policies', () => {
    it('should throw on invalid YAML', () => {
      const yaml = `invalid: yaml: [`;
      expect(() => parsePolicy(yaml)).toThrow(PolicyError);
    });

    it('should throw on missing version', () => {
      const yaml = `
rules:
  - name: test
    description: "Test"
    paths: ["src/**"]
    action: allow
default: allow
`;
      expect(() => parsePolicy(yaml)).toThrow('Missing required field: version');
    });

    it('should throw on unsupported version', () => {
      const yaml = `
version: 2
rules:
  - name: test
    description: "Test"
    paths: ["src/**"]
    action: allow
default: allow
`;
      expect(() => parsePolicy(yaml)).toThrow('Unsupported policy version: 2');
    });

    it('should throw on missing rules', () => {
      const yaml = `
version: 1
default: allow
`;
      expect(() => parsePolicy(yaml)).toThrow('Missing required field: rules');
    });

    it('should throw on empty rules array', () => {
      const yaml = `
version: 1
rules: []
default: allow
`;
      expect(() => parsePolicy(yaml)).toThrow('Policy must have at least one rule');
    });

    it('should throw on missing default', () => {
      const yaml = `
version: 1
rules:
  - name: test
    description: "Test"
    paths: ["src/**"]
    action: allow
`;
      expect(() => parsePolicy(yaml)).toThrow('Missing required field: default');
    });

    it('should throw on invalid default action', () => {
      const yaml = `
version: 1
rules:
  - name: test
    description: "Test"
    paths: ["src/**"]
    action: allow
default: invalid_action
`;
      expect(() => parsePolicy(yaml)).toThrow('Invalid default action');
    });
  });
});