#!/usr/bin/env node
/**
 * Rismon CLI entry point.
 *
 * Loads the bundled CLI output from dist-cli/rismon.mjs (built via
 * `npm run build:cli`). This indirection keeps the `bin` path stable even
 * though the source is TypeScript and needs a build step.
 */
import "./../dist-cli/rismon.mjs";