#!/usr/bin/env node
'use strict';

// Watch a folder, a file or a glob, and run a command when something changes.
// Plain Node APIs in CommonJS, so it runs on Node 12 and newer, and on Bun.

const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

const [target, ...cmdArgs] = process.argv.slice(2);

if (!target || cmdArgs.length === 0) {
	console.error('Please provide what to watch and a command to run:');
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

// One argument is a shell command as it is, like 'bun test && bun run build'.
// Several arguments are quoted one by one, so an argument with a space in it stays one argument.
const quote = arg => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`);
const command = cmdArgs.length === 1 ? cmdArgs[0] : cmdArgs.map(quote).join(' ');

// An existing file is a file and an existing folder is a folder. Everything else is a glob.
const found = statOrNull(target);
const watchers = [];

if (found && found.isFile()) {
	// A file is used as it is, also when its name has glob characters in it.
	// The folder is watched, so a file saved by writing a new one and renaming it is still seen.
	const file = path.resolve(target);
	watch(path.dirname(file), false, changed => changed === file);
} else if (found && found.isDirectory()) {
	watch(target, true, () => true);
} else {
	const pattern = target.replace(/^\.\//, '');
	const glob = globToRegex(pattern);
	const matches = walk(globBase(pattern)).filter(file => glob.test(file));

	if (matches.length === 0) {
		console.error(`Error: No files found matching pattern '${target}'.`);
		process.exit(1);
	}

	// Watch the folders of the matching files
	const dirs = new Set(matches.map(file => path.dirname(file)));
	dirs.forEach(dir =>
		watch(dir, false, changed => glob.test(path.relative(process.cwd(), changed)))
	);
}

let running = false;
let again = false;
let timer;

// Editors often fire a few events for one save, so wait for it to settle and run once
function onChange() {
	clearTimeout(timer);
	timer = setTimeout(run, 50);
}

// A change while the command runs gives one more run when it is done, no matter how many files changed
function run() {
	if (running) {
		again = true;
		return;
	}
	running = true;
	spawn('sh', ['-c', command], {stdio: 'inherit'}).on('exit', () => {
		running = false;
		if (again) {
			again = false;
			run();
		}
	});
}

// Watch a folder, and call onChange when a path in it passes the check.
// Node before 19.1 can not watch subfolders on Linux, so there each folder there is now gets its own watcher.
function watch(dir, recursive, check) {
	const nodeMajor = Number(process.versions.node.split('.')[0]);
	const canRecurse = process.platform !== 'linux' || nodeMajor >= 20 || process.versions.bun;
	const dirs = recursive && !canRecurse ? [dir].concat(walk(dir, true)) : [dir];

	dirs.forEach(d => {
		const options = {recursive: recursive && !!canRecurse};
		watchers.push(
			fs.watch(d, options, (event, name) => {
				if (name && check(path.resolve(d, String(name)))) onChange();
			})
		);
	});
}

// The files (or only the folders) under a folder. Names starting with . are left out, like Bun's glob does.
function walk(dir, onlyDirs) {
	let found = [];
	let entries = [];
	try {
		entries = fs.readdirSync(dir, {withFileTypes: true});
	} catch (e) {} // Not there
	entries.forEach(entry => {
		if (entry.name[0] === '.') return;
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) found = found.concat(onlyDirs ? [p] : [], walk(p, onlyDirs));
		else if (!onlyDirs) found.push(p);
	});
	return found;
}

// The folder before the first part with glob characters, so the search for files does not start higher than needed
function globBase(pattern) {
	const parts = pattern.split('/');
	const i = parts.findIndex(part => /[*?[{]/.test(part));
	return parts.slice(0, i).join('/') || '.';
}

// A glob as a regex. ** is any number of folders, * and ? stay within one folder, {a,b} is a or b, and [abc] is one of the characters.
function globToRegex(glob) {
	let re = '';
	let braces = 0;
	for (let i = 0; i < glob.length; i++) {
		const c = glob[i];
		const end = c === '[' ? glob.indexOf(']', i + 2) : -1;
		if (glob.startsWith('**/', i)) {
			re += '(?:[^/]*/)*';
			i += 2;
		} else if (glob.startsWith('**', i)) {
			re += '.*';
			i += 1;
		} else if (c === '*') re += '[^/]*';
		else if (c === '?') re += '[^/]';
		else if (c === '{') {
			re += '(?:';
			braces++;
		} else if (c === '}' && braces) {
			re += ')';
			braces--;
		} else if (c === ',' && braces) re += '|';
		else if (end > 0) {
			re +=
				'[' +
				glob
					.slice(i + 1, end)
					.replace(/^!/, '^')
					.replace(/\\/g, '\\\\') +
				']';
			i = end;
		} else re += c.replace(/[.+^$()|\\[\]{}]/g, '\\$&');
	}
	return new RegExp('^' + re + '$');
}

function statOrNull(p) {
	try {
		return fs.statSync(p);
	} catch (e) {
		return null;
	}
}

process.on('SIGINT', () => {
	watchers.forEach(watcher => watcher.close());
	console.log('');
	process.exit(0);
});
