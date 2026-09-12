const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testDir = path.join(projectRoot, 'src', 'test', 'analyzer');
const testFile = path.join(testDir, 'inventory.test.ts');

const header = `/**
 * Tests for Rismon Repository Inventory
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildInventory,
  categorizeFile,
  isIgnoredPath,
  isAuthLikePath,
  isBackendLikePath,
  isFrontendLikePath,
  isDatabaseLikePath,
  isDeploymentLikePath,
} from '../../analyzer/inventory';
import { FileCategory, AnalyzerError } from '../../analyzer/types';

function writePlaceholder(root: string, rel: string, content: string = 'placeholder'): void {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

function snapshotTree(inv: ReturnType<typeof buildInventory>): string {
  return JSON.stringify({
    repositoryName: inv.repositoryName,
    files: inv.files.map((f) => ({ path: f.path, category: f.category })),
    ignoredDirs: inv.ignoredDirs,
  }, null, 2);
}
`;

fs.mkdirSync(testDir, { recursive: true });
fs.writeFileSync(testFile, header, 'utf-8');
console.log('Created header:', testFile);
