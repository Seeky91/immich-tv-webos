#!/usr/bin/env node
// Transpiles dist/main.js down to webOS-compatible syntax (Chromium 68 / webOS 5.0+).
// Enact CLI excludes most node_modules from babel-loader, so dependencies like
// @tanstack/query-core ship modern syntax (??=, ??, ?., #privateField, …) into the
// bundle, which older webOS versions cannot parse. Combined with the runtime
// polyfills in src/polyfills.ts, this brings the supported floor down to LG TVs
// from 2018 onward (OLED CX 2020 included).

import { build, transform } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TARGET = 'chrome68';
const BUNDLE = 'dist/main.js';
const INDEX_HTML = 'dist/index.html';

if (!existsSync(BUNDLE)) {
	console.error(`[transpile-legacy] missing input: ${BUNDLE}`);
	process.exit(1);
}

// Inject an inline <script> into index.html that polyfills `globalThis` BEFORE
// the deferred main.js loads. webpack's own runtime (which prefixes every bundle)
// reads `globalThis` at startup, before any user import — so the in-bundle
// polyfill in src/polyfills.ts comes too late. The inline script must be NON-
// deferred and placed before the main script tag so it executes during HTML
// parsing. Idempotent: `||= window` keeps native globalThis on modern engines.
if (existsSync(INDEX_HTML)) {
	const POLYFILL_SCRIPT = '<script>window.globalThis=window.globalThis||window;</script>';
	const POLYFILL_MARKER = 'window.globalThis=window.globalThis||window';
	const html = readFileSync(INDEX_HTML, 'utf8');
	if (!html.includes(POLYFILL_MARKER)) {
		const patched = html.replace(/<script defer="defer" src="\.\/main\.js"><\/script>/, `${POLYFILL_SCRIPT}<script defer="defer" src="./main.js"></script>`);
		if (patched === html) {
			console.error('[transpile-legacy] WARNING: could not locate main.js script tag in index.html — globalThis polyfill not injected');
		} else {
			writeFileSync(INDEX_HTML, patched);
			console.log('[transpile-legacy] injected globalThis polyfill into index.html');
		}
	}
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
