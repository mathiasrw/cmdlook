#!/usr/bin/env bun

// Check if Bun is available globally
if (typeof globalThis.Bun === 'undefined') {
	console.error('Error: Bun is required but not found.');
	console.error('Please install Bun to use this tool:');
	console.error('  curl -fsSL https://bun.sh/install | bash');
	console.error('  export BUN_INSTALL="$HOME/.bun"');
	console.error('  export PATH="$BUN_INSTALL/bin:$PATH"');
	process.exit(1);
}

import {watch, existsSync, statSync} from 'fs';
import {Glob} from 'bun';
import {resolve, join, relative} from 'path';

const target = process.argv[2] || '.';

// Check if target is a glob pattern (contains * or {)
const isGlob = target.includes('*') || target.includes('{');

const cmdArgs = process.argv.slice(3);
if (cmdArgs.length === 0) {
	console.error('Please provide a command to run:');
	console.error('  cmdlook <target> <command> <args...>');
	console.error('  cmdlook . bun test');
	console.error('  cmdlook ./src bun run build');
	console.error('  cmdlook ./styles bunx tailwindcss -i input.css -o output.css');
	console.error("  cmdlook 'src/**/*.ts' bun run build");
	console.error('');
	console.error(
		"Just use the command line arguments as you would normally - don't put it all in quotes."
	);
	process.exit(1);
}

let watchPaths = [];

if (!isGlob) {
	if (!existsSync(target) || !statSync(target).isDirectory()) {
		console.error(`Error: '${target}' does not exist or is not a directory.`);
		process.exit(1);
	}
	watchPaths = [target];
} else {
	const glob = new Glob(target);
	const matches = Array.from(glob.scanSync({absolute: false, onlyFiles: true}));

	if (matches.length === 0) {
		console.error(`Error: No files found matching pattern '${target}'.`);
		process.exit(1);
	}

	// Get unique parent directories of the matching files
	const uniqueDirs = new Set();
	for (const match of matches) {
		const parentDir = match.split('/').slice(0, -1).join('/') || '.';
		uniqueDirs.add(parentDir);
	}

	watchPaths = Array.from(uniqueDirs);
}

let isRunning = false;
let plzRun = false;

const runCommand = async () => {
	if (isRunning || !plzRun) return;

	isRunning = true;
	plzRun = false;

	try {
		const proc = Bun.spawn(['sh', '-c', cmdArgs.join(' ')], {stdout: 'inherit', stderr: 'inherit'});
		await proc.exited;
	} catch (error) {
		console.error('Command failed:', error.message);
		process.exit(1);
	} finally {
		isRunning = false;
		runCommand();
	}
};

const watchers = [];

// Create watchers for all parent folders
const glob = isGlob ? new Glob(target) : null;

for (const watchPath of watchPaths) {
	const watcher = watch(watchPath, {recursive: !isGlob}, (event, filename) => {
		if (filename) {
			// For glob patterns, only trigger if the changed file matches the pattern
			if (isGlob) {
				const fullPath = resolve(watchPath, filename);
				const relPath = relative(process.cwd(), fullPath);
				if (glob.match(relPath)) {
					plzRun = true;
					runCommand();
				}
			} else {
				// For directory watching, trigger on any change
				plzRun = true;
				runCommand();
			}
		}
	});
	watchers.push(watcher);
}

process.on('SIGINT', () => {
	for (const watcher of watchers) {
		watcher.close();
	}
	console.log('');
	process.exit(0);
});
