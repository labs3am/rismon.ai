import { describe, it, expect } from 'vitest';
import { evaluatePolicy, evaluateFilePath } from '@/policy/evaluator';
import { Policy, PolicyAction, ChangedFile, FileStatus } from '@/policy/types';

const samplePolicy: Policy = {
  version: 1,
  rules: [
    {
      name: 'protect-auth',
      description: 'Authentication changes require review',
      paths: ['src/auth/**', 'src/middleware/auth*'],
      action: PolicyAction.REQUIRE_REVIEW,
    },
    {
      name: 'protect-payments',
      description: 'Payment code is sensitive',
      paths: ['src/payments/**', 'src/billing/**'],
      action: PolicyAction.REQUIRE_REVIEW,
    },
    {
      name: 'protect-production',
      description: 'Production infrastructure is locked',
      paths: ['.github/workflows/**', 'infra/**', 'terraform/**'],
      action: PolicyAction.BLOCK,
    },
    {
      name: 'frontend-allow',
      description: 'Frontend changes are allowed',
      paths: ['src/components/**', 'src/pages/**', 'src/styles/**'],
      action: PolicyAction.ALLOW,
    },
  ],
  default: PolicyAction.REQUIRE_REVIEW,
};

describe('evaluatePolicy', () => {
  describe('single file evaluations', () => {
    it('should return ALLOW for matching allow rule', () => {
      const files: ChangedFile[] = [
        { path: 'src/components/Button.tsx', status: FileStatus.MODIFIED },
      ];
      const result = evaluatePolicy(samplePolicy, files);
      expect(result.decision).toBe(PolicyAction.ALLOW);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].rule).toBe('frontend-allow');
    });

    it('should return REQUIRE_REVIEW for matching require_review rule', () => {
      const files: ChangedFile[] = [
        { path: 'src/auth/session.ts', status: FileStatus.MODIFIED },
      ];
      const result = evaluatePolicy(samplePolicy, files);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
      expect(result.matches[0].rule).toBe('protect-auth');
    });

    it('should return BLOCK for matching block rule', () => {
      const files: ChangedFile[] = [
        { path: '.github/workflows/deploy.yml', status: FileStatus.MODIFIED },
      ];
      const result = evaluatePolicy(samplePolicy, files);
      expect(result.decision).toBe(PolicyAction.BLOCK);
      expect(result.matches[0].rule).toBe('protect-production');
    });

    it('should use default action for unmatched files', () => {
      const files: ChangedFile[] = [
        { path: 'README.md', status: FileStatus.MODIFIED },
      ];
      const result = evaluatePolicy(samplePolicy, files);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
      expect(result.matches[0].rule).toBe('(default)');
    });
  });

  describe('multiple file evaluations', () => {
    it('should return strongest action across multiple files', () => {
      const files: ChangedFile[] = [
        { path: 'src/components/Button.tsx', status: FileStatus.MODIFIED },
        { path: 'src/auth/session.ts', status: FileStatus.MODIFIED },
        { path: '.github/workflows/deploy.yml', status: FileStatus.MODIFIED },
      ];
      const result = evaluatePolicy(samplePolicy, files);
      expect(result.decision).toBe(PolicyAction.BLOCK);
      expect(result.matches).toHaveLength(3);
    });

    it('should return BLOCK even if other files are ALLOW', () => {
      const files: ChangedFile[] = [
        { path: 'src/components/Button.tsx', status: FileStatus.MODIFIED },
        { path: 'infra/main.tf', status: FileStatus.ADDED },
      ];
      const result = evaluatePolicy(samplePolicy, files);
      expect(result.decision).toBe(PolicyAction.BLOCK);
    });
  });

  describe('overlapping rules', () => {
    it('should use strongest action when multiple rules match', () => {
      const policy: Policy = {
        version: 1,
        rules: [
          {
            name: 'allow-all',
            description: 'Allow all src',
            paths: ['src/**'],
            action: PolicyAction.ALLOW,
          },
          {
            name: 'block-auth',
            description: 'Block auth',
            paths: ['src/auth/**'],
            action: PolicyAction.BLOCK,
          },
        ],
        default: PolicyAction.ALLOW,
      };
      const files: ChangedFile[] = [
        { path: 'src/auth/session.ts', status: FileStatus.MODIFIED },
      ];
      const result = evaluatePolicy(policy, files);
      expect(result.decision).toBe(PolicyAction.BLOCK);
    });
  });

  describe('file statuses', () => {
    it('should detect renamed files using both paths', () => {
      const files: ChangedFile[] = [
        {
          path: 'src/auth/new-session.ts',
          previousPath: 'src/auth/old-session.ts',
          status: FileStatus.RENAMED,
        },
      ];
      const result = evaluatePolicy(samplePolicy, files);
      expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
    });
  });

  describe('empty inputs', () => {
    it('should return ALLOW for empty file list', () => {
      const result = evaluatePolicy(samplePolicy, []);
      expect(result.decision).toBe(PolicyAction.ALLOW);
      expect(result.matches).toHaveLength(0);
    });
  });
});

describe('evaluateFilePath', () => {
  it('should evaluate a single file path', () => {
    expect(evaluateFilePath(samplePolicy, 'src/auth/session.ts')).toBe(PolicyAction.REQUIRE_REVIEW);
    expect(evaluateFilePath(samplePolicy, 'src/components/Button.tsx')).toBe(PolicyAction.ALLOW);
    expect(evaluateFilePath(samplePolicy, '.github/workflows/deploy.yml')).toBe(PolicyAction.BLOCK);
  });
});