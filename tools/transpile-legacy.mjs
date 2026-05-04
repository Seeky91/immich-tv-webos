#!/usr/bin/env node
// Transpiles dist/main.js down to webOS-compatible syntax (Chromium 79 / webOS 6.0+).
// Enact CLI excludes most node_modules from babel-loader, so dependencies like
// @tanstack/query-core ship modern syntax (??=, ??, ?.) into the bundle, which
// older webOS versions cannot parse.

import { build, transform } from 'esbuild';
import { readFileSync, existsSync } from 'node:fs';

const TARGET = 'chrome79';
const BUNDLE = 'dist/main.js';

if (!existsSync(BUNDLE)) {
	console.error(`[transpile-legacy] missing input: ${BUNDLE}`);
	process.exit(1);
}

await build({
	entryPoints: [BUNDLE],
	outfile: BUNDLE,
	target: TARGET,
	bundle: false,
	minify: true,
	sourcemap: false,
	allowOverwrite: true,
	legalComments: 'none',
	logLevel: 'warning',
});

// Round-trip parse: re-feed the output to esbuild with the same target.
// If unsupported syntax slipped through (or was reintroduced), this errors.
try {
	await transform(readFileSync(BUNDLE, 'utf8'), { target: TARGET, loader: 'js' });
} catch (err) {
	console.error(`[transpile-legacy] FAILED: bundle does not parse cleanly under ${TARGET}`);
	console.error(err.message || err);
	process.exit(2);
}

console.log(`[transpile-legacy] ${BUNDLE} → ${TARGET} (parse-validated)`);
