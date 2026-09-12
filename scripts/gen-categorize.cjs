const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testDir = path.join(projectRoot, 'src', 'test', 'analyzer');
const testFile = path.join(testDir, 'inventory.test.ts');

const categorizeFileTests = `
describe('categorizeFile', () => {
  it('classifies TypeScript source files as source', () => {
    expect(categorizeFile('src/index.ts', 'index.ts')).toBe(FileCategory.SOURCE);
    expect(categorizeFile('app.tsx', 'app.tsx')).toBe(FileCategory.SOURCE);
    expect(categorizeFile('utils.mjs', 'utils.mjs')).toBe(FileCategory.SOURCE);
  });

  it('classifies config files', () => {
    expect(categorizeFile('.eslintrc.json', '.eslintrc.json')).toBe(FileCategory.CONFIG);
    expect(categorizeFile('tsconfig.json', 'tsconfig.json')).toBe(FileCategory.CONFIG);
    expect(categorizeFile('vite.config.ts', 'vite.config.ts')).toBe(FileCategory.CONFIG);
  });

  it('classifies manifest files', () => {
    expect(categorizeFile('package.json', 'package.json')).toBe(FileCategory.MANIFEST);
    expect(categorizeFile('yarn.lock', 'yarn.lock')).toBe(FileCategory.MANIFEST);
    expect(categorizeFile('go.mod', 'go.mod')).toBe(FileCategory.MANIFEST);
  });

  it('classifies deployment files', () => {
    expect(categorizeFile('Dockerfile', 'Dockerfile')).toBe(FileCategory.DEPLOYMENT);
    expect(categorizeFile('vercel.json', 'vercel.json')).toBe(FileCategory.DEPLOYMENT);
    expect(categorizeFile('Procfile', 'Procfile')).toBe(FileCategory.DEPLOYMENT);
  });

  it('classifies test files', () => {
    expect(categorizeFile('src/__tests__/utils.test.ts', 'utils.test.ts')).toBe(FileCategory.TEST);
    expect(categorizeFile('test/helpers.spec.js', 'helpers.spec.js')).toBe(FileCategory.TEST);
  });

  it('classifies database files', () => {
    expect(categorizeFile('prisma/schema.prisma', 'schema.prisma')).toBe(FileCategory.DATABASE);
    expect(categorizeFile('migrations/001.sql', '001.sql')).toBe(FileCategory.DATABASE);
  });

  it('classifies documentation files', () => {
    expect(categorizeFile('README.md', 'README.md')).toBe(FileCategory.DOC);
    expect(categorizeFile('docs/guide.md', 'guide.md')).toBe(FileCategory.DOC);
  });

  it('returns OTHER for unrecognized files', () => {
    expect(categorizeFile('data/file.csv', 'file.csv')).toBe(FileCategory.OTHER);
    expect(categorizeFile('assets/image.png', 'image.png')).toBe(FileCategory.OTHER);
  });

  it('handles files with no extension', () => {
    expect(categorizeFile('Makefile', 'Makefile')).toBe(FileCategory.OTHER);
    expect(categorizeFile('Dockerfile', 'Dockerfile')).toBe(FileCategory.DEPLOYMENT);
  });
});
`;

fs.appendFileSync(testFile, categorizeFileTests, 'utf-8');
console.log('Appended categorizeFile tests to:', testFile);
