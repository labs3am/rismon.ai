import { describe, it, expect } from 'vitest';
import {
  buildPolicy,
  buildPolicyFromAnalysis,
  getDefaultAction,
  getDefaultActions,
  validateSelections,
  type PolicySelections,
} from '@/policy/builder';
import {
  PolicyAction,
  parsePolicy,
  evaluatePolicy,
  PolicyError,
} from '@/policy';
import type { RepositoryAnalysis, RepositoryArea, RepositoryFile } from '@/analyzer';

function makeFile(path: string, category: string = 'source'): RepositoryFile {
  const segments = path.split('/');
  const name = segments[segments.length - 1];
  const ext = name.includes('.') ? name.split('.').pop() || '' : '';
  return { path, name, extension: ext, size: 100, category: category as any };
}

function makeArea(id: string, name: string, description: string, paths: string[], confidence: number = 0.9): RepositoryArea {
  return { id, name, description, paths, confidence, signals: [`signal-${id}`] };
}

function makeAnalysis(areas: RepositoryArea[] = [], files: RepositoryFile[] = []): RepositoryAnalysis {
  return {
    repositoryName: 'test-repo',
    rootPath: '/tmp/test-repo',
    files,
    areas,
    analyzedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('getDefaultAction', () => {
  const cases: [string, PolicyAction][] = [
    ['documentation', PolicyAction.ALLOW],
    ['tests', PolicyAction.ALLOW],
    ['frontend', PolicyAction.ALLOW],
    ['configuration', PolicyAction.REQUIRE_REVIEW],
    ['dependencies', PolicyAction.REQUIRE_REVIEW],
    ['core-logic', PolicyAction.REQUIRE_REVIEW],
    ['database', PolicyAction.REQUIRE_REVIEW],
    ['auth-security', PolicyAction.REQUIRE_REVIEW],
    ['deployment-infra', PolicyAction.BLOCK],
  ];

  it.each(cases)('returns %s → %s', (areaId, expected) => {
    expect(getDefaultAction(areaId)).toBe(expected);
  });

  it('returns require_review for unknown area IDs', () => {
    // Unknown areas fall back to require_review (the safe default)
    expect(getDefaultAction('unknown-area')).toBe(PolicyAction.REQUIRE_REVIEW);
    expect(getDefaultAction('exotic-category')).toBe(PolicyAction.REQUIRE_REVIEW);
  });
});

describe('validateSelections', () => {
  it('returns empty object for null/undefined', () => {
    expect(validateSelections(null)).toEqual({});
    expect(validateSelections(undefined)).toEqual({});
  });

  it('accepts valid selections', () => {
    const input = { frontend: 'allow', database: 'require_review' };
    expect(validateSelections(input)).toEqual({
      frontend: PolicyAction.ALLOW,
      database: PolicyAction.REQUIRE_REVIEW,
    });
  });

  it('throws PolicyError for invalid input', () => {
    expect(() => validateSelections('invalid')).toThrow(PolicyError);
    expect(() => validateSelections({ frontend: 'bad' })).toThrow(PolicyError);
  });
});

describe('buildPolicyFromAnalysis', () => {
  it('assigns a policy action to every detected area', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'Frontend', 'UI code', ['src/components/**']),
      makeArea('database', 'Database', 'DB code', ['supabase/**']),
    ]);

    const policy = buildPolicyFromAnalysis(analysis);

    expect(policy.rules).toHaveLength(2);
    expect(policy.rules[0].action).toBe(PolicyAction.ALLOW);
    expect(policy.rules[1].action).toBe(PolicyAction.REQUIRE_REVIEW);
  });

  it('uses real analyzer paths and generates correct names', () => {
    const analysis = makeAnalysis([
      makeArea('auth-security', 'Auth', 'Auth code', ['src/auth/**']),
    ]);

    const policy = buildPolicyFromAnalysis(analysis);
    expect(policy.rules[0].paths).toEqual(['src/auth/**']);
    expect(policy.rules[0].name).toBe('area-auth-security');
    expect(policy.rules[0].description).toBe('Auth code');
    expect(policy.default).toBe(PolicyAction.REQUIRE_REVIEW);
  });

  it('owner can override any default action', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'Frontend', 'UI code', ['src/components/**']),
    ]);

    const policy = buildPolicyFromAnalysis(analysis, { frontend: PolicyAction.BLOCK });
    expect(policy.rules[0].action).toBe(PolicyAction.BLOCK);
  });

  it('partial overrides leave other areas at defaults', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'Frontend', 'UI code', ['src/components/**']),
      makeArea('database', 'Database', 'DB code', ['supabase/**']),
      makeArea('tests', 'Tests', 'Test code', ['src/test/**']),
    ]);

    const policy = buildPolicyFromAnalysis(analysis, { database: PolicyAction.BLOCK });
    expect(policy.rules[0].action).toBe(PolicyAction.ALLOW);
    expect(policy.rules[1].action).toBe(PolicyAction.BLOCK);
    expect(policy.rules[2].action).toBe(PolicyAction.ALLOW);
  });

  it('handles zero areas', () => {
    const policy = buildPolicyFromAnalysis(makeAnalysis([]));
    expect(policy.rules).toHaveLength(0);
    expect(policy.default).toBe(PolicyAction.REQUIRE_REVIEW);
  });

  it('throws PolicyError for invalid input', () => {
    expect(() => buildPolicyFromAnalysis(null as any)).toThrow(PolicyError);
    expect(() => buildPolicyFromAnalysis({} as any)).toThrow(PolicyError);
  });
});
describe('generatePolicyYaml — parser round-trip', () => {
  it('generated YAML is parseable by the existing parser', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'Frontend', 'UI code', ['src/components/**']),
      makeArea('database', 'Database', 'DB code', ['supabase/**']),
    ]);

    const { yaml } = buildPolicy(analysis);
    const policy = parsePolicy(yaml);

    expect(policy.version).toBe(1);
    expect(policy.rules).toHaveLength(2);
    expect(policy.default).toBe(PolicyAction.REQUIRE_REVIEW);
  });

  it('all three actions produce valid parseable YAML', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'Frontend', 'UI', ['src/components/**']),
      makeArea('database', 'Database', 'DB', ['supabase/**']),
      makeArea('deployment-infra', 'Deployment', 'Deploy', ['.github/**']),
    ]);

    const { yaml } = buildPolicy(analysis);
    const policy = parsePolicy(yaml);

    expect(policy.rules[0].action).toBe(PolicyAction.ALLOW);
    expect(policy.rules[1].action).toBe(PolicyAction.REQUIRE_REVIEW);
    expect(policy.rules[2].action).toBe(PolicyAction.BLOCK);
  });
});

describe('Generated policy — evaluator integration', () => {
  it('ALLOW lets matching changes through', () => {
    const analysis = makeAnalysis([makeArea('frontend', 'F', 'D', ['src/components/**'])]);
    const { yaml } = buildPolicy(analysis);
    const policy = parsePolicy(yaml);
    const result = evaluatePolicy(policy, [{ path: 'src/components/Button.tsx', status: 'modified' as any }]);
    expect(result.decision).toBe(PolicyAction.ALLOW);
  });

  it('REVIEW flags matching changes for review', () => {
    const analysis = makeAnalysis([makeArea('database', 'D', 'DB', ['supabase/**'])]);
    const { yaml } = buildPolicy(analysis);
    const policy = parsePolicy(yaml);
    const result = evaluatePolicy(policy, [{ path: 'supabase/migrations/001.sql', status: 'modified' as any }]);
    expect(result.decision).toBe(PolicyAction.REQUIRE_REVIEW);
  });

  it('BLOCK blocks matching changes', () => {
    const analysis = makeAnalysis([makeArea('deployment-infra', 'D', 'Deploy', ['.github/**'])]);
    const { yaml } = buildPolicy(analysis);
    const policy = parsePolicy(yaml);
    const result = evaluatePolicy(policy, [{ path: '.github/workflows/deploy.yml', status: 'modified' as any }]);
    expect(result.decision).toBe(PolicyAction.BLOCK);
  });

  it('owner override is respected by evaluator', () => {
    const analysis = makeAnalysis([makeArea('frontend', 'F', 'D', ['src/components/**'])]);
    const { yaml } = buildPolicy(analysis, { frontend: PolicyAction.BLOCK });
    const policy = parsePolicy(yaml);
    const result = evaluatePolicy(policy, [{ path: 'src/components/Button.tsx', status: 'modified' as any }]);
    expect(result.decision).toBe(PolicyAction.BLOCK);
  });
});

describe('No invented paths', () => {
  it('only uses paths from the analyzer', () => {
    const realPaths = ['src/components/ui/Button.tsx', 'src/pages/index.tsx'];
    const analysis = makeAnalysis([makeArea('frontend', 'F', 'D', realPaths)]);
    const policy = buildPolicyFromAnalysis(analysis);
    expect(policy.rules[0].paths).toEqual(realPaths);
  });

  it('never adds rules for areas not in the analysis', () => {
    const analysis = makeAnalysis([makeArea('frontend', 'F', 'D', ['src/components/**'])]);
    const policy = buildPolicyFromAnalysis(analysis);
    const ruleNames = policy.rules.map((r) => r.name);
    expect(ruleNames).toContain('area-frontend');
    expect(ruleNames).not.toContain('area-database');
  });
});

describe('buildPolicy convenience wrapper', () => {
  it('returns policy, yaml, and areaActions together', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'Frontend', 'UI', ['src/components/**']),
      makeArea('database', 'Database', 'DB', ['supabase/**']),
    ]);

    const result = buildPolicy(analysis);
    expect(result.policy).toBeDefined();
    expect(result.yaml).toBeDefined();
    expect(result.areaActions).toHaveLength(2);
    expect(result.areaActions[0].defaultAction).toBe(PolicyAction.ALLOW);
    expect(result.areaActions[1].defaultAction).toBe(PolicyAction.REQUIRE_REVIEW);
  });
});

describe('getDefaultActions', () => {
  it('returns default actions for all areas', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'F', 'D', ['src/**']),
      makeArea('deployment-infra', 'D', 'D', ['.github/**']),
    ]);

    const defaults = getDefaultActions(analysis);
    expect(defaults).toHaveLength(2);
    expect(defaults[0].defaultAction).toBe(PolicyAction.ALLOW);
    expect(defaults[1].defaultAction).toBe(PolicyAction.BLOCK);
  });

  it('returns empty array for empty analysis', () => {
    expect(getDefaultActions(makeAnalysis([]))).toEqual([]);
  });
});

describe('Determinism', () => {
  it('same analysis always produces the same policy', () => {
    const analysis = makeAnalysis([
      makeArea('frontend', 'F', 'D', ['src/components/**']),
    ]);

    expect(buildPolicyFromAnalysis(analysis)).toEqual(buildPolicyFromAnalysis(analysis));
  });
});