import { describe, it, expect } from 'vitest';
import { parsePolicy, evaluatePolicy } from '@/policy';
import { PolicyAction, FileStatus } from '@/policy/types';

const sampleYaml = `
version: 1
rules:
  - name: protect-auth
    description: "Authentication changes require review"
    paths:
      - "src/auth/**"
      - "src/middleware/auth*"
    action: require_review

  - name: protect-payments
    description: "Payment code is sensitive"
    paths:
      - "src/payments/**"
      - "src/billing/**"
    action: require_review

  - name: protect-production
    description: "Production infrastructure is locked"
    paths:
      - ".github/workflows/**"
      - "infra/**"
      - "terraform/**"
    action: block

  - name: frontend-allow
    description: "Frontend changes are allowed"
    paths:
      - "src/components/**"
      - "src/pages/**"
      - "src/styles/**"
    action: allow

default: require_review
`;

describe('Policy Engine Integration', () => {
  describe('full flow: parse + evaluate', () => {
    it('should parse YAML and evaluate files', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: 'src/auth/session.ts', status: FileStatus.MODIFIED },
      ]);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
      expect(result.matches[0].rule).toBe('protect-auth');
    });

    it('should handle complex PR scenarios', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: 'src/components/Button.tsx', status: FileStatus.MODIFIED },
        { path: 'src/pages/Home.tsx', status: FileStatus.ADDED },
        { path: 'src/styles/main.css', status: FileStatus.MODIFIED },
      ]);
      expect(result.decision).toBe(PolicyAction.ALLOW);
    });

    it('should block when any file matches block rule', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: 'src/components/Button.tsx', status: FileStatus.MODIFIED },
        { path: '.github/workflows/deploy.yml', status: FileStatus.MODIFIED },
      ]);
      expect(result.decision).toBe(PolicyAction.BLOCK);
    });

    it('should require review for unmatched files', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: 'README.md', status: FileStatus.MODIFIED },
        { path: 'docs/API.md', status: FileStatus.ADDED },
      ]);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
    });
  });

  describe('path normalization in integration', () => {
    it('should handle leading ./ in file paths', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: './src/auth/session.ts', status: FileStatus.MODIFIED },
      ]);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
    });

    it('should handle nested directories', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: 'src/auth/utils/session.ts', status: FileStatus.MODIFIED },
      ]);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
    });
  });

  describe('renamed files in integration', () => {
    it('should detect renamed protected files', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        {
          path: 'src/auth/new-session.ts',
          previousPath: 'src/auth/old-session.ts',
          status: FileStatus.RENAMED,
        },
      ]);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
    });

    it('should detect rename from protected to unprotected', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        {
          path: 'src/utils/helper.ts',
          previousPath: 'src/auth/session.ts',
          status: FileStatus.RENAMED,
        },
      ]);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
    });
  });

  describe('result structure', () => {
    it('should provide detailed match information', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: 'src/auth/session.ts', status: FileStatus.MODIFIED },
      ]);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]).toEqual({
        file: 'src/auth/session.ts',
        rule: 'protect-auth',
        action: PolicyAction.REQUIRE_REVIEW,
        reason: 'Authentication changes require review',
      });
    });

    it('should include all matches for multiple files', () => {
      const policy = parsePolicy(sampleYaml);
      const result = evaluatePolicy(policy, [
        { path: 'src/auth/session.ts', status: FileStatus.MODIFIED },
        { path: 'src/payments/checkout.ts', status: FileStatus.MODIFIED },
      ]);
      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].rule).toBe('protect-auth');
      expect(result.matches[1].rule).toBe('protect-payments');
    });
  });
});