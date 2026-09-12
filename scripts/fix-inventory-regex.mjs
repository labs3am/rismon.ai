#!/usr/bin/env node
/**
 * One-off codemod: repairs regex literals doubled by PowerShell here-string
 * quoting in src/analyzer/inventory.ts. Run: node scripts/fix-inventory-regex.mjs
 */
import fs from 'fs';

const file = 'src/analyzer/inventory.ts';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  //  let p = raw.replace(/\\/g, '/');
  {
    from: "let p = raw.replace(/\\\\\\\\/g, '/');",
    to: "let p = raw.replace(/\\\\/g, '/');",
  },
  {
    from: "p = p.replace(/^(\\\\.\\\\/|\\\\/)+/, '');",
    to: "p = p.replace(/^(\\.\\/|\\/)+/, '');",
  },
  {
    from: "p = p.replace(/\\\\/+/g, '/');",
    to: "p = p.replace(/\\/+/g, '/');",
  },
  {
    from: "return p.replace(/\\\\/$/, '');",
    to: "return p.replace(/\\/$/, '');",
  },
];

let changed = 0;
for (const { from, to } of replacements) {
  if (source.includes(from)) {
    source = source.split(from).join(to);
    changed += 1;
  }
}

fs.writeFileSync(file, source);
console.log(`fixed ${changed}/${replacements.length} regex patterns`);
if (changed !== replacements.length) process.exit(1);