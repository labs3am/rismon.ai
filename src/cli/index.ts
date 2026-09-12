#!/usr/bin/env node

/**
 * Rismon CLI
 *
 * A command-line interface for checking repository changes against policies
 * and analyzing repository structure.
 *
 * Usage:
 *   rismon check           Check current changes against policy
 *   rismon check --json    Output results as JSON
 *   rismon analyze         Analyze repository structure
 *   rismon analyze --json  Output analysis as JSON
 */

import { findRepoRoot, getChangedFiles, GitError } from '@/git';
import { parsePolicy, evaluatePolicy, buildPolicyFromAnalysis, generatePolicyYaml, validateSelections } from '@/policy';
import { PolicyAction, PolicyResult, PolicyError, ChangedFile, PolicySelections } from '@/policy';
import { analyzeRepositorySafe, analyzeRepository, type AnalyzeOutcome, type RepositoryAnalysis } from '@/analyzer';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

/**
 * Exit codes for the CLI.
 */
export enum ExitCode {
  ALLOW = 0,
  REQUIRE_REVIEW = 1,
  BLOCK = 2,
  ERROR = 3,
}

/**
 * CLI options.
 */
interface CliOptions {
  json: boolean;
  selectionsFile?: string;
  dryRun?: boolean;
  writeFile?: boolean;
}

/**
 * JSON output structure.
 */
interface JsonOutput {
  decision: string;
  matches: Array<{
    file: string;
    rule: string;
    action: string;
    reason: string;
  }>;
  files: Array<{
    path: string;
    status: string;
    previousPath?: string;
  }>;
}

/**
 * Runs a policy check for a repository directory.
 * This is the testable core of `rismon check` and never touches process state.
 * On success it returns the policy result; on failure it returns an error result.
 */
export type CheckSuccess = {
  ok: true;
  result: PolicyResult;
  changedFiles: ChangedFile[];
  exitCode: ExitCode;
};

export type CheckFailure = {
  ok: false;
  error: string;
  exitCode: ExitCode.ERROR;
};

export type CheckOutcome = CheckSuccess | CheckFailure;

/**
 * Analyze success/failure outcomes.
 *
 * Converts the analyzer's AnalyzeOutcome (which has exitCode: number) into
 * the CLI's ExitCode enum for consistent exit code handling.
 */
export type AnalyzeSuccess = {
  ok: true;
  analysis: RepositoryAnalysis;
  exitCode: ExitCode;
};

export type AnalyzeFailure = {
  ok: false;
  error: string;
  exitCode: ExitCode;
};

export type AnalyzeLocalOutcome = AnalyzeSuccess | AnalyzeFailure;

/**
 * Runs a policy check for a repository directory.
 * This is the testable core of `rismon check` and never touches process state.
 * On success it returns the policy result; on failure it returns an error result.
 */
export async function runCheck(
  startDir: string,
  options: CliOptions
): Promise<CheckOutcome> {
  try {
    // Find repository root
    const repoRoot = findRepoRoot(startDir);

    // Load policy
    const policyPath = path.join(repoRoot, '.rismon.yml');
    let policyContent: string;
    try {
      policyContent = fs.readFileSync(policyPath, 'utf-8');
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError?.code === 'ENOENT') {
        throw new PolicyError(
          `No policy file found at ${policyPath}. Create a .rismon.yml policy before running rismon check.`
        );
      }
      throw new PolicyError(
        `Failed to read policy file at ${policyPath}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
    const policy = parsePolicy(policyContent);

    // Get changed files (excluding the policy file itself)
    const allChangedFiles = getChangedFiles(repoRoot);
    const relativePolicyPath = path.relative(repoRoot, policyPath);
    const changedFiles = allChangedFiles.filter((file) => {
      const normalizedPath = file.path.replace(/\\/g, '/');
      const normalizedPolicyPath = relativePolicyPath.replace(/\\/g, '/');
      return normalizedPath !== normalizedPolicyPath;
    });

    // Evaluate policy
    const result = evaluatePolicy(policy, changedFiles);
    const exitCode = getExitCode(result.decision);

    return { ok: true, result, changedFiles, exitCode };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message, exitCode: ExitCode.ERROR };
  }
}

/**
 * Main entry point for the CLI.
 * @param args CLI args (defaults to process.argv).
 * @param cwd Working directory to resolve the repo from (defaults to process.cwd()).
 *          Exposed as a parameter so tests can run without process.chdir().
 */
export async function main(args: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> {
  const command = args[0];
  const normalizedArgs = normalizeArgs(args);
  if (normalizedArgs === null) {
    printUsage();
    return ExitCode.ERROR;
  }

  const options = parseOptions(normalizedArgs);

  // Route to the appropriate command handler
  if (command === 'analyze') {
    try {
      const outcome = await runAnalyze(cwd, options);
      return await reportJsonOrHuman(outcome, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(`Error: ${message}`);
      }
      return ExitCode.ERROR;
    }
  }

  // Route `policy build` to the policy builder
  if (command === 'policy' && args[1] === 'build') {
    const outcome = await runPolicyBuild(cwd, options);
    if (!outcome.ok) {
      if (options.json) {
        console.error(JSON.stringify({ error: outcome.error }, null, 2));
      } else {
        console.error(`Error: ${outcome.error}`);
      }
      return ExitCode.ERROR;
    }

    if (options.json) {
      console.log(JSON.stringify({
        policyPath: outcome.policyPath,
        written: outcome.written,
        areaActions: outcome.areaActions,
        yaml: outcome.yaml,
      }, null, 2));
    } else {
      console.log('Rismon Policy Builder\n');
      console.log('Detected areas:\n');
      for (const aa of outcome.areaActions) {
        console.log(`  ${aa.areaName}`);
        console.log(`    Action: ${aa.action}`);
        console.log();
      }
      if (outcome.written) {
        console.log(`Policy written to: ${outcome.policyPath}`);
      } else {
        console.log('Dry run — no file written.');
        console.log(`Would write to: ${outcome.policyPath}`);
      }
      console.log();
      console.log('Generated policy:');
      console.log(outcome.yaml);
    }
    return ExitCode.ALLOW;
  }

  // Default: run check command
  try {
    const outcome = await runCheck(cwd, options);
    if (outcome.ok === false) {
      const message = outcome.error;
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(`Error: ${message}`);
        printUsage();
      }
      return outcome.exitCode;
    }
    const { result, changedFiles, exitCode } = outcome;

    // Output results
    if (options.json) {
      outputJson(result, changedFiles);
    } else {
      outputHumanReadable(result, changedFiles);
    }

    // Return appropriate exit code
    return exitCode;
  } catch (error) {
    if (error instanceof PolicyError) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }, null, 2));
      } else {
        console.error(`Error: ${error.message}`);
      }
      return ExitCode.ERROR;
    }

    if (error instanceof GitError) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }, null, 2));
      } else {
        console.error(`Error: ${error.message}`);
      }
      return ExitCode.ERROR;
    }

    // Unexpected error
    if (options.json) {
      console.error(
        JSON.stringify({
          error: `Unexpected error: ${error instanceof Error ? error.message : 'unknown error'}`,
        }, null, 2)
      );
    } else {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    return ExitCode.ERROR;
  }
}

/**
 * Parses command-line arguments.
 *
 * Accepts both `rismon check` and legacy direct-flag invocations.
 * Returns null when the command is not recognized.
 */
function parseArgs(args: string[]): CliOptions | null {
  const normalizedArgs = normalizeArgs(args);
  if (normalizedArgs === null) {
    return null;
  }

  return parseOptions(normalizedArgs);
}

/**
 * Normalizes CLI arguments into option args for supported commands.
 * Returns null when a supported command is not present.
 */
function normalizeArgs(args: string[]): string[] | null {
  if (args.length === 0) {
    return [];
  }

  if (args[0] === 'check' || args[0] === 'analyze') {
    return args.slice(1);
  }

  // Support `rismon policy build [options]`
  if (args[0] === 'policy') {
    if (args.length < 2 || args[1] !== 'build') {
      return null;
    }
    return args.slice(2);
  }

  // Preserve backward compatibility for tests and scripts that call the
  // check command implementation directly with option flags.
  if (
    args[0] === '--json' ||
    args[0] === '--help' ||
    args[0] === '-h' ||
    args[0].startsWith('-')
  ) {
    return args;
  }

  return null;
}

/**
 * Parses option args for `rismon check`.
 */
function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    json: args.includes('--json'),
  };

  // Parse --selections <file> for policy build
  const selectionsIndex = args.indexOf('--selections');
  if (selectionsIndex !== -1 && selectionsIndex + 1 < args.length) {
    options.selectionsFile = args[selectionsIndex + 1];
  }

  // Parse --dry-run for policy build
  options.dryRun = args.includes('--dry-run');

  // Parse --write for policy build (actually write the file)
  options.writeFile = args.includes('--write');

  return options;
}

/**
 * Prints CLI usage information.
 */
function printUsage(): void {
  console.error('Usage:');
  console.error('  rismon check [--json]');
  console.error('  rismon analyze [--json]');
  console.error('  rismon policy build [--selections <file>] [--dry-run] [--write]');
  console.error('');
  console.error('Commands:');
  console.error('  check       Evaluate working-tree Git changes against .rismon.yml.');
  console.error('  analyze     Analyze repository structure and detect areas.');
  console.error('  policy build  Generate .rismon.yml from analysis.');
  console.error('');
  console.error('Options:');
  console.error('  --json              Output results as JSON.');
  console.error('  --selections <file> Path to JSON file with owner action overrides.');
  console.error('  --dry-run           Show what would be generated without writing.');
  console.error('  --write             Actually write the .rismon.yml file.');
}

/**
 * Outputs results in human-readable format.
 */
function outputHumanReadable(result: PolicyResult, changedFiles: ChangedFile[]): void {
  console.log('Rismon Policy Check\n');

  if (changedFiles.length === 0) {
    console.log('No changes detected.');
    console.log('\nDecision: ALLOW');
    return;
  }

  // Group matches by file
  const matchesByFile = new Map<string, typeof result.matches>();
  for (const match of result.matches) {
    const existing = matchesByFile.get(match.file) || [];
    existing.push(match);
    matchesByFile.set(match.file, existing);
  }

  // Output each file
  for (const file of changedFiles) {
    const matches = matchesByFile.get(file.path) || [];
    const action = matches.length > 0 ? matches[0].action : PolicyAction.ALLOW;
    const rule = matches.length > 0 ? matches[0].rule : '(none)';

    const icon = getActionIcon(action);
    const label = getActionLabel(action);

    console.log(`${icon} ${file.path}`);
    console.log(`  ${label}`);
    console.log(`  Rule: ${rule}`);
    console.log();
  }

  // Overall decision
  const decisionLabel = getActionLabel(result.decision);
  console.log(`Decision: ${decisionLabel}`);
}

/**
 * Outputs results as JSON.
 */
function outputJson(result: PolicyResult, changedFiles: ChangedFile[]): void {
  const output: JsonOutput = {
    decision: result.decision,
    matches: result.matches.map((match) => ({
      file: match.file,
      rule: match.rule,
      action: match.action,
      reason: match.reason,
    })),
    files: changedFiles.map((file) => ({
      path: file.path,
      status: file.status,
      previousPath: file.previousPath,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Gets the icon for an action.
 */
function getActionIcon(action: PolicyAction): string {
  switch (action) {
    case PolicyAction.ALLOW:
      return '✓';
    case PolicyAction.REQUIRE_REVIEW:
      return '⚠';
    case PolicyAction.BLOCK:
      return '✕';
    default:
      return '?';
  }
}

/**
 * Gets the human-readable label for an action.
 */
function getActionLabel(action: PolicyAction): string {
  switch (action) {
    case PolicyAction.ALLOW:
      return 'ALLOWED';
    case PolicyAction.REQUIRE_REVIEW:
      return 'REVIEW REQUIRED';
    case PolicyAction.BLOCK:
      return 'BLOCKED';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Gets the exit code for a decision.
 */
function getExitCode(decision: PolicyAction): ExitCode {
  switch (decision) {
    case PolicyAction.ALLOW:
      return ExitCode.ALLOW;
    case PolicyAction.REQUIRE_REVIEW:
      return ExitCode.REQUIRE_REVIEW;
    case PolicyAction.BLOCK:
      return ExitCode.BLOCK;
    default:
      return ExitCode.ERROR;
  }
}

// Runs `rismon analyze` and produces a structured analysis outcome.
// This is the testable core of the analyze command: repository root is resolved
// via the existing Git helper (so it behaves consistently with `rismon check`),
// then handed to the read-only analyzer.
export async function runAnalyze(
  startDir: string,
  options: CliOptions
): Promise<AnalyzeLocalOutcome> {
  try {
    // Find repository root via the same Git helper used by `rismon check`.
    const repoRoot = findRepoRoot(startDir);

    const outcome = analyzeRepositorySafe(repoRoot);

    if (outcome.ok) {
      return {
        ok: true,
        analysis: outcome.analysis,
        exitCode: ExitCode.ALLOW,
      };
    }

    return {
      ok: false,
      error: (outcome as { ok: false; error: string }).error,
      exitCode: ExitCode.ERROR,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred while running the analysis.';
    return {
      ok: false,
      error: message,
      exitCode: ExitCode.ERROR,
    };
  }
}

/**
 * Runs `rismon policy build`: analyzes a repository and generates a .rismon.yml
 * policy file. The owner is shown each detected area with a deterministic
 * default action, then can override any action via a selections file.
 *
 * By default this is a dry-run unless `writeFile` is true.
 */
export type PolicyBuildOutcome = {
  ok: true;
  yaml: string;
  policyPath: string;
  written: boolean;
  areaActions: Array<{ areaId: string; areaName: string; action: PolicyAction }>;
} | {
  ok: false;
  error: string;
};

export async function runPolicyBuild(
  startDir: string,
  options: CliOptions & { selectionsFile?: string; dryRun?: boolean; writeFile?: boolean }
): Promise<PolicyBuildOutcome> {
  try {
    // Find repository root via the same Git helper used by `rismon check`.
    const repoRoot = findRepoRoot(startDir);

    // Run the analyzer on the repository root.
    const analysis = analyzeRepository(repoRoot);

    // Load owner selections from file if provided.
    let selections: PolicySelections = {};
    if (options.selectionsFile) {
      const selectionsPath = path.resolve(options.selectionsFile);
      let selectionsContent: string;
      try {
        selectionsContent = fs.readFileSync(selectionsPath, 'utf-8');
      } catch (error) {
        return {
          ok: false,
          error: `Failed to read selections file at ${selectionsPath}: ${error instanceof Error ? error.message : 'unknown error'}`,
        };
      }
      try {
        selections = validateSelections(JSON.parse(selectionsContent));
      } catch (error) {
        return {
          ok: false,
          error: `Invalid selections file: ${error instanceof Error ? error.message : 'unknown error'}`,
        };
      }
    }

    // Build the policy from the analysis and owner selections.
    const policy = buildPolicyFromAnalysis(analysis, selections);
    const yaml = generatePolicyYaml(policy);

    const policyPath = path.join(repoRoot, '.rismon.yml');

    // Show each area and its resolved action.
    const areaActions = analysis.areas.map((area) => ({
      areaId: area.id,
      areaName: area.name,
      action: selections[area.id] || getDefaultActionForArea(area.id),
    }));

    if (options.dryRun || !options.writeFile) {
      return {
        ok: true,
        yaml,
        policyPath,
        written: false,
        areaActions,
      };
    }

    // Check if a policy already exists — never silently overwrite.
    if (fs.existsSync(policyPath)) {
      return {
        ok: false,
        error: `Policy file already exists at ${policyPath}. Use --force to overwrite.`,
      };
    }

    fs.writeFileSync(policyPath, yaml, 'utf-8');

    return {
      ok: true,
      yaml,
      policyPath,
      written: true,
      areaActions,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred while building the policy.';
    return {
      ok: false,
      error: message,
    };
  }
}

function getDefaultActionForArea(areaId: string): PolicyAction {
  const defaults: Record<string, PolicyAction> = {
    documentation: PolicyAction.ALLOW,
    tests: PolicyAction.ALLOW,
    frontend: PolicyAction.ALLOW,
    configuration: PolicyAction.REQUIRE_REVIEW,
    dependencies: PolicyAction.REQUIRE_REVIEW,
    'core-logic': PolicyAction.REQUIRE_REVIEW,
    database: PolicyAction.REQUIRE_REVIEW,
    'auth-security': PolicyAction.REQUIRE_REVIEW,
    'deployment-infra': PolicyAction.BLOCK,
  };
  return defaults[areaId] ?? PolicyAction.REQUIRE_REVIEW;
}

// Shared output path for both `check` and `analyze` so the `main` function
// stays small and deterministic.
async function reportJsonOrHuman(outcome: {
  ok: boolean;
  exitCode: ExitCode;
  result?: PolicyResult;
  changedFiles?: ChangedFile[];
  analysis?: RepositoryAnalysis;
  error?: string;
}, options: CliOptions): Promise<ExitCode> {
  if (options.json) {
    if (outcome.ok && outcome.analysis) {
      console.log(JSON.stringify({
        repositoryName: outcome.analysis.repositoryName,
        rootPath: outcome.analysis.rootPath,
        files: outcome.analysis.files.map((file) => ({
          path: file.path,
          extension: file.extension,
          size: file.size,
          category: file.category,
        })),
        areas: outcome.analysis.areas,
        analyzedAt: outcome.analysis.analyzedAt,
      }, null, 2));
    } else if (outcome.ok && outcome.result) {
      const output: JsonOutput = {
        decision: outcome.result.decision,
        matches: outcome.result.matches.map((match) => ({
          file: match.file,
          rule: match.rule,
          action: match.action,
          reason: match.reason,
        })),
        files: (outcome.changedFiles || []).map((file) => ({
          path: file.path,
          status: file.status,
          previousPath: file.previousPath,
        })),
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.error(JSON.stringify({ error: outcome.error ?? 'An unknown error occurred' }, null, 2));
    }
  } else if (outcome.ok && outcome.analysis) {
    console.log('Rismon Repository Analysis\n');

    console.log(`Repository: ${outcome.analysis.repositoryName}`);
    console.log(`Path: ${outcome.analysis.rootPath}`);
    console.log(`Files analyzed: ${outcome.analysis.files.length}`);
    console.log();

    if (outcome.analysis.areas.length === 0) {
      console.log('No significant areas detected.');
      console.log('(This is a minimal repository or one without recognizable structure.)');
    } else {
      console.log('Detected areas:\n');

      for (const area of outcome.analysis.areas) {
        const confidencePercent = Math.round(area.confidence * 100);
        console.log(`${area.name}`);
        console.log(`  Confidence: ${confidencePercent}%`);
        console.log(`  Paths:`);
        for (const dirPath of area.paths) {
          console.log(`    ${dirPath}`);
        }
        console.log();
      }
    }

    console.log(`Files analyzed: ${outcome.analysis.files.length}`);
  } else if (outcome.ok && outcome.result) {
    outputHumanReadable(outcome.result, outcome.changedFiles || []);
  } else {
    console.error(outcome.error ?? 'An unknown error occurred');
  }

  return outcome.exitCode;
}

// Run the CLI directly when this module is the script being executed.
// Uses the ESM equivalent of `require.main === module`.
const isMainModule =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  main().then((code) => {
    process.exitCode = code;
  });
}