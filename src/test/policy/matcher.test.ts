import { describe, it, expect } from 'vitest';
import { normalizePath, matchesGlob, findMatchingRules } from '@/policy/matcher';
import { PolicyRule, PolicyAction, ChangedFile, FileStatus } from '@/policy/types';

describe('normalizePath', () => {
  it('should use forward slashes', () => {
    expect(normalizePath('src\\auth\\session.ts')).toBe('src/auth/session.ts');
  });

  it('should remove leading ./', () => {
    expect(normalizePath('./src/auth/session.ts')).toBe('src/auth/session.ts');
  });

  it('should remove leading /', () => {
    expect(normalizePath('/src/auth/session.ts')).toBe('src/auth/session.ts');
  });

  it('should normalize redundant separators', () => {
    expect(normalizePath('src//auth///session.ts')).toBe('src/auth/session.ts');
  });

  it('should handle empty string', () => {
    expect(normalizePath('')).toBe('');
  });

  it('should handle complex paths', () => {
    expect(normalizePath('./src/../src/auth/./session.ts')).toBe('src/../src/auth/./session.ts');
  });
});

describe('matchesGlob', () => {
  it('should match exact paths', () => {
    expect(matchesGlob('src/auth/session.ts', 'src/auth/session.ts')).toBe(true);
  });

  it('should match with ** glob', () => {
    expect(matchesGlob('src/auth/session.ts', 'src/auth/**')).toBe(true);
    expect(matchesGlob('src/auth/utils/session.ts', 'src/auth/**')).toBe(true);
    expect(matchesGlob('src/other/session.ts', 'src/auth/**')).toBe(false);
  });

  it('should match with * glob', () => {
    expect(matchesGlob('src/auth/session.ts', 'src/auth/*.ts')).toBe(true);
    expect(matchesGlob('src/auth/utils/session.ts', 'src/auth/*.ts')).toBe(false);
  });

  it('should match with ? glob', () => {
    expect(matchesGlob('src/auth/a.ts', 'src/auth/?.ts')).toBe(true);
    expect(matchesGlob('src/auth/ab.ts', 'src/auth/?.ts')).toBe(false);
  });

  it('should handle leading ./ in pattern', () => {
    expect(matchesGlob('src/auth/session.ts', './src/auth/**')).toBe(true);
  });

  it('should handle leading ./ in path', () => {
    expect(matchesGlob('./src/auth/session.ts', 'src/auth/**')).toBe(true);
  });
});

describe('findMatchingRules', () => {
  const rules: PolicyRule[] = [
    {
      name: 'auth',
      description: 'Auth rule',
      paths: ['src/auth/**'],
      action: PolicyAction.REQUIRE_REVIEW,
    },
    {
      name: 'payments',
      description: 'Payments rule',
      paths: ['src/payments/**', 'src/billing/**'],
      action: PolicyAction.BLOCK,
    },
    {
      name: 'frontend',
      description: 'Frontend rule',
      paths: ['src/components/**', 'src/pages/**'],
      action: PolicyAction.ALLOW,
    },
  ];

  it('should find matching rules for a file', () => {
    const file: ChangedFile = { path: 'src/auth/session.ts', status: FileStatus.MODIFIED };
    const matches = findMatchingRules(file, rules);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('auth');
  });

  it('should find multiple matching rules', () => {
    const file: ChangedFile = { path: 'src/payments/checkout.ts', status: FileStatus.MODIFIED };
    const matches = findMatchingRules(file, rules);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('payments');
  });

  it('should return empty array for unmatched files', () => {
    const file: ChangedFile = { path: 'README.md', status: FileStatus.MODIFIED };
    const matches = findMatchingRules(file, rules);
    expect(matches).toHaveLength(0);
  });

  it('should check previous path for renamed files', () => {
    const file: ChangedFile = {
      path: 'src/auth/new-session.ts',
      previousPath: 'src/auth/old-session.ts',
      status: FileStatus.RENAMED,
    };
    const matches = findMatchingRules(file, rules);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('auth');
  });

  it('should match if only previous path matches', () => {
    const file: ChangedFile = {
      path: 'src/utils/helper.ts',
      previousPath: 'src/auth/session.ts',
      status: FileStatus.RENAMED,
    };
    const matches = findMatchingRules(file, rules);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('auth');
  });
});