const fs = require('fs');
const filePath = 'src/cli/index.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Fix: The main function needs to route to runAnalyze when command is 'analyze'
// Currently it always calls runCheck regardless of the command.

const oldMain = `export async function main(args: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> {
  const normalizedArgs = normalizeArgs(args);
  if (normalizedArgs === null) {
    printUsage();
    return ExitCode.ERROR;
  }

  const options = parseOptions(normalizedArgs);

  try {
    const outcome = await runCheck(cwd, options);
    if (outcome.ok === false) {
      const message = outcome.error;
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(\`Error: \${message}\`);
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
        console.error(\`Error: \${error.message}\`);
      }
      return ExitCode.ERROR;
    }

    if (error instanceof GitError) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }, null, 2));
      } else {
        console.error(\`Error: \${error.message}\`);
      }
      return ExitCode.ERROR;
    }

    // Unexpected error
    if (options.json) {
      console.error(
        JSON.stringify({
          error: \`Unexpected error: \${error instanceof Error ? error.message : 'unknown error'}\`,
        }, null, 2)
      );
    } else {
      console.error(\`Unexpected error: \${error instanceof Error ? error.message : 'unknown error'}\`);
    }
    return ExitCode.ERROR;
  }
}`;

const newMain = `export async function main(args: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> {
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
        console.error(\`Error: \${message}\`);
      }
      return ExitCode.ERROR;
    }
  }

  // Default: run check command
  try {
    const outcome = await runCheck(cwd, options);
    if (outcome.ok === false) {
      const message = outcome.error;
      if (options.json) {
        console.error(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(\`Error: \${message}\`);
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
        console.error(\`Error: \${error.message}\`);
      }
      return ExitCode.ERROR;
    }

    if (error instanceof GitError) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }, null, 2));
      } else {
        console.error(\`Error: \${error.message}\`);
      }
      return ExitCode.ERROR;
    }

    // Unexpected error
    if (options.json) {
      console.error(
        JSON.stringify({
          error: \`Unexpected error: \${error instanceof Error ? error.message : 'unknown error'}\`,
        }, null, 2)
      );
    } else {
      console.error(\`Unexpected error: \${error instanceof Error ? error.message : 'unknown error'}\`);
    }
    return ExitCode.ERROR;
  }
}`;

if (content.includes(oldMain)) {
  content = content.replace(oldMain, newMain);
  fs.writeFileSync(filePath, content);
  console.log('Fix applied successfully');
} else {
  console.log('ERROR: Could not find the old main function text');
  console.log('Searching for partial match...');
  if (content.includes('const normalizedArgs = normalizeArgs(args);')) {
    console.log('Found partial match - function exists but text may differ');
  }
}