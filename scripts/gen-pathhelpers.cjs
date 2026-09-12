const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testDir = path.join(projectRoot, 'src', 'test', 'analyzer');
const testFile = path.join(testDir, 'inventory.test.ts');

const pathHelperTests = `
describe('isIgnoredPath', () => {
  it('returns true for known ignored directories', () => {
    expect(isIgnoredPath('node_modules/pkg/index.js')).toBe(true);
    expect(isIgnoredPath('dist/bundle.js')).toBe(true);
    expect(isIgnoredPath('.git/objects/pack')).toBe(true);
    expect(isIgnoredPath('vendor/lib.js')).toBe(true);
  });

  it('returns false for non-ignored paths', () => {
    expect(isIgnoredPath('src/app.ts')).toBe(false);
    expect(isIgnoredPath('docs/readme.md')).toBe(false);
    expect(isIgnoredPath('package.json')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isIgnoredPath('Node_Modules/pkg/index.js')).toBe(true);
    expect(isIgnoredPath('DIST/bundle.js')).toBe(true);
  });
});

describe('isAuthLikePath', () => {
  it('returns true for auth/security directories', () => {
    expect(isAuthLikePath('auth/login.ts')).toBe(true);
    expect(isAuthLikePath('security/session.ts')).toBe(true);
    expect(isAuthLikePath('authz/check.ts')).toBe(true);
  });

  it('returns true for auth-like filenames', () => {
    expect(isAuthLikePath('login.ts')).toBe(true);
    expect(isAuthLikePath('logout.ts')).toBe(true);
    expect(isAuthLikePath('session-manager.ts')).toBe(true);
    expect(isAuthLikePath('signup.ts')).toBe(true);
  });

  it('returns false for unrelated paths', () => {
    expect(isAuthLikePath('src/app.ts')).toBe(false);
    expect(isAuthLikePath('frontend/ui.ts')).toBe(false);
  });
});

describe('isBackendLikePath', () => {
  it('returns true for backend-like directories', () => {
    expect(isBackendLikePath('api/users.ts')).toBe(true);
    expect(isBackendLikePath('server/index.ts')).toBe(true);
    expect(isBackendLikePath('backend/service.ts')).toBe(true);
    expect(isBackendLikePath('worker/queue.ts')).toBe(true);
  });

  it('returns false for non-backend paths', () => {
    expect(isBackendLikePath('frontend/App.tsx')).toBe(false);
  });
});

describe('isFrontendLikePath', () => {
  it('returns true for frontend-like directories', () => {
    expect(isFrontendLikePath('frontend/App.tsx')).toBe(true);
    expect(isFrontendLikePath('client/ui.ts')).toBe(true);
    expect(isFrontendLikePath('web/components.tsx')).toBe(true);
  });

  it('returns false for non-frontend paths', () => {
    expect(isFrontendLikePath('server/index.ts')).toBe(false);
    expect(isFrontendLikePath('database/migrations.sql')).toBe(false);
  });
});

describe('isDatabaseLikePath', () => {
  it('returns true for database-like directories', () => {
    expect(isDatabaseLikePath('db/schema.sql')).toBe(true);
    expect(isDatabaseLikePath('database/migrations/001.sql')).toBe(true);
  });

  it('returns false for non-database paths', () => {
    expect(isDatabaseLikePath('src/app.ts')).toBe(false);
  });
});

describe('isDeploymentLikePath', () => {
  it('returns true for deployment directories', () => {
    expect(isDeploymentLikePath('deploy/production.yml')).toBe(true);
    expect(isDeploymentLikePath('infra/main.tf')).toBe(true);
  });

  it('returns false for non-deployment paths', () => {
    expect(isDeploymentLikePath('src/index.ts')).toBe(false);
  });
});
`;

fs.appendFileSync(testFile, pathHelperTests, 'utf-8');
console.log('Appended path helper tests to:', testFile);
console.log('Total size:', fs.statSync(testFile).size, 'bytes');
