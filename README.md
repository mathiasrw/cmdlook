# cmdlook

> Watch files and run commands when they change

A tiny file watcher that runs a command whenever files in a directory are updated. Perfect for development workflows where you need to automatically rebuild, test, or restart processes when source code changes.

# Usage

You get one parameter to specify what to watch, the rest is your full command.

```bash
# Specify directory to watch all files recursively
cmdlook . bun test

# Use globs to be more specific
cmdlook "./**/*.{ts,tsx}" bun run build

# Remember globs are powerful
cmdlook "{src,test,styles}/**/*.{ts,tsx,css,js,jsx,tsx,ts}" bun run format


```

## Install

Or install locally and use with `bunx`:

```bash
bun install cmdlook
# or
bunx cmdlook ./src bun run build
```

## Usage

Just use the command line arguments as you would normally - don't put it all in quotes.

]

# Good to know

- If the command is currently running while files are being updated, it will run again after the current run is finished - but only once no matter how many files got updated.
- Press `Ctrl+C` to stop watching and exit cleanly

## Features

- Directory watching for monitoring specified directories recursively
- Glob pattern support for using `*` and `{}` patterns to watch specific files
- Command queuing for preventing overlapping executions
- Clean exit for properly handling Ctrl+C
- Zero dependencies for lightweight and fast operation
- Bun optimization for using Bun.spawn for best performance

## Glob Patterns

When the first parameter contains `*` or `{`, cmdlook treats it as a glob pattern:

- `**/*.ts` - All TypeScript files recursively
- `*.{js,ts}` - All JavaScript and TypeScript files in current directory
- `src/**/*.css` - All CSS files in src directory and subdirectories
- `test/*.test.js` - All test files in test directory

The tool automatically determines which directories to watch based on the matching files.

**Note**: Glob patterns are evaluated once at startup. New files that match the pattern created after cmdlook starts will not be detected until you restart cmdlook.

# test
