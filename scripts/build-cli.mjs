#!/usr/bin/env node
/**
 * Builds the Rismon CLI as a standalone ESM bundle.
 *
 * Uses esbuild (already available as a transitive dependency of Vite) so we
 * don't need to add any new dependencies. The output in dist-cli/ is a single
 * self-contained JS file that can be invoked via `bin/rismon.mjs`.
 *
 * Run with: node scripts/build-cli.mjs
 */

import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await build({
  entryPoints: [path.join(root, "src/cli/index.ts")],
  outfile: path.join(root, "dist-cli/rismon.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  // The shebang is already present at the top of src/cli/index.ts; esbuild
  // carries it through. Do NOT add a second banner here.
  alias: {
    "@": path.join(root, "src"),
  },
  // `yaml` and `minimatch` are left external: the `yaml` package performs a
  // dynamic require("process") at module init which cannot be statically
  // bundled into an ESM file. They resolve from node_modules at runtime.
  external: ["yaml", "minimatch"],
  logLevel: "info",
});

console.log("CLI bundled to dist-cli/rismon.mjs");