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

```bash
npm install cmdlook --save-dev
# or
bun add -d cmdlook
# or run it without installing
npx cmdlook ./src npm run build
bunx cmdlook ./src bun run build
```

It runs on Node 12 and newer, and on Bun.

## Usage

Just use the command line arguments as you would normally - don't put it all in quotes. Each argument stays one argument, also when it has a space in it.

If the command is a single argument, it is run as it is in `sh`, so `cmdlook . 'bun test && bun run build'` works too.

The first parameter can be a file, a folder or a glob. A file that exists is used as it is, also when its name has glob characters in it. A folder that exists is watched with all its subfolders. Everything else is a glob.

# Good to know

- A few changes within 50 ms count as one, so one save gives one run.
- If the command is currently running while files are being updated, it will run again after the current run is finished - but only once no matter how many files got updated.
- Press `Ctrl+C` to stop watching and exit cleanly

## Features

- Directory watching for monitoring specified directories recursively
- Glob pattern support for using `*`, `**`, `?`, `[abc]` and `{a,b}` to watch specific files
- Command queuing for preventing overlapping executions
- Clean exit for properly handling Ctrl+C
- Zero dependencies for lightweight and fast operation
- Runs on Node 12 and newer, and on Bun

## Glob Patterns

When the first parameter is not a file or a folder that exists, cmdlook treats it as a glob pattern

- `**/*.ts` - All TypeScript files recursively
- `*.{js,ts}` - All JavaScript and TypeScript files in current directory
- `src/**/*.css` - All CSS files in src directory and subdirectories
- `test/*.test.js` - All test files in test directory

The tool automatically determines which directories to watch based on the matching files.

Glob patterns are evaluated once at startup, and the folders of the matching files are watched. A new matching file in one of those folders is picked up. A new file in another folder is not, until you restart cmdlook.
