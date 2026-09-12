const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testDir = path.join(projectRoot, 'src', 'test', 'analyzer');
const testFile = path.join(testDir, 'inventory.test.ts');

const buildInventoryTests = `
describe('buildInventory', () => {
  const tmpRoot = path.join(__dirname, '..', '..', '..', 'tmp-test-inventory');
  let tmpDir: string;

  beforeAll(() => fs.mkdirSync(tmpRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  beforeEach(() => {
    tmpDir = path.join(tmpRoot, \`build-\${Math.random().toString(36).slice(2)}\`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('returns empty inventory for an empty directory', () => {
    const inventory = buildInventory(tmpDir);
    expect(inventory.files).toEqual([]);
    expect(inventory.ignoredDirs).toEqual([]);
    expect(inventory.repositoryName).toBe(path.basename(tmpDir));
  });

  it('skips ignored directories', () => {
    writePlaceholder(tmpDir, 'node_modules/pkg/index.js', 'ignored');
    writePlaceholder(tmpDir, 'dist/bundle.js', 'ignored');
    writePlaceholder(tmpDir, 'build/output.js', 'ignored');
    writePlaceholder(tmpDir, '.git/HEAD', 'ignored');
    writePlaceholder(tmpDir, 'src/main.ts', 'real');

    const inventory = buildInventory(tmpDir);
    expect(inventory.files.length).toBe(1);
    expect(inventory.files[0].path).toBe('src/main.ts');
    const ignoredPaths = inventory.ignoredDirs.map((p) => p.toLowerCase());
    expect(ignoredPaths).toContain('node_modules');
    expect(ignoredPaths).toContain('dist');
    expect(ignoredPaths).toContain('build');
    expect(ignoredPaths).toContain('.git');
  });

  it('does not enumerate files inside ignored dirs', () => {
    writePlaceholder(tmpDir, 'node_modules/left-pad/index.js', 'ignored');
    writePlaceholder(tmpDir, 'src/app.ts', 'real');
    const inventory = buildInventory(tmpDir);
    const paths = inventory.files.map((f) => f.path);
    expect(paths).not.toContain('node_modules/left-pad/index.js');
    expect(paths).toContain('src/app.ts');
  });

  it('handles .git correctly', () => {
    writePlaceholder(tmpDir, '.git/config', 'ignored');
    const inventory = buildInventory(tmpDir);
    expect(inventory.ignoredDirs.map((p) => p.toLowerCase())).toContain('.git');
    expect(inventory.files.length).toBe(0);
  });

  it('handles .gitignore file alongside .git dir', () => {
    writePlaceholder(tmpDir, '.gitignore', 'root .gitignore');
    writePlaceholder(tmpDir, 'src/index.ts', 'real');
    const inventory = buildInventory(tmpDir);
    expect(inventory.files.length).toBe(2);
    const names = inventory.files.map((f) => f.name);
    expect(names).toContain('.gitignore');
    expect(names).toContain('index.ts');
  });

  it('throws for missing directory', () => {
    expect(() => buildInventory(path.join(tmpDir, 'missing'))).toThrow(AnalyzerError);
  });

  it('throws for file path not directory', () => {
    const file = path.join(tmpDir, 'a-file.txt');
    fs.writeFileSync(file, 'not a dir', 'utf-8');
    expect(() => buildInventory(file)).toThrow(AnalyzerError);
  });

  it('is deterministic across repeated runs', () => {
    writePlaceholder(tmpDir, 'b.ts', 'b');
    writePlaceholder(tmpDir, 'a.ts', 'a');
    writePlaceholder(tmpDir, 'sub/c.ts', 'c');
    const run1 = buildInventory(tmpDir);
    const run2 = buildInventory(tmpDir);
    expect(snapshotTree(run1)).toBe(snapshotTree(run2));
  });
});
`;

fs.appendFileSync(testFile, buildInventoryTests, 'utf-8');
console.log('Appended buildInventory tests to:', testFile);
