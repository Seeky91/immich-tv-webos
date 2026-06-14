#!/usr/bin/env node
// Prunes unused iLib locale data from dist/ before packaging.
//
// Enact's ILibPlugin (@enact/dev-utils) copies the FULL ilib-webos locale tree
// (~6500 files / ~74MB: every locale + charmaps/ + charset/) into
// dist/node_modules/ilib/locale on every `enact pack`. The app UI is English-only,
// so we keep only the root fallback data (locale/*.json) + `en/` + `und/`, delete
// every other locale plus the charset-conversion data (the bundle never instantiates
// ilib Charset/Charmap), and rewrite ilibmanifest.json to match.
//
// Why rewrite the manifest and not just delete files: @enact/i18n's Loader gates
// every fetch on manifest membership (isAvailable), and treats an ABSENT manifest as
// "load everything in this dir" — so leaving the manifest listing now-deleted files
// (or removing it entirely) makes ilib XHR the missing files at runtime and 404-spam.
// The manifest must list exactly what remains on disk. Absent locales then degrade
// gracefully to ilib's inlined LocaleInfo.defaultInfo (no throw).
//
// Runs in pack-p AFTER transpile-legacy.mjs and BEFORE ares-package. Idempotent.

import { readdirSync, statSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOCALE_DIR = 'dist/node_modules/ilib/locale';
const MANIFEST = join(LOCALE_DIR, 'ilibmanifest.json');
const KEEP_DIRS = new Set(['en', 'und']);

if (!existsSync(LOCALE_DIR)) {
	console.error(`[prune-ilib] missing input: ${LOCALE_DIR} (did enact pack run?)`);
	process.exit(1);
}
if (!existsSync(MANIFEST)) {
	console.error(`[prune-ilib] missing manifest: ${MANIFEST}`);
	process.exit(1);
}

// Single source of truth: a locale-relative path survives iff it is a root-level
// file (no slash) or lives under a kept locale dir. Mirrors the disk deletion below.
const keep = (rel) => !rel.includes('/') || KEEP_DIRS.has(rel.split('/')[0]);

// 1) Delete every top-level dir that isn't a kept locale (this also removes
//    charmaps/ and charset/). Root-level files are always left in place.
let removed = 0;
for (const entry of readdirSync(LOCALE_DIR)) {
	const full = join(LOCALE_DIR, entry);
	if (statSync(full).isDirectory() && !KEEP_DIRS.has(entry)) {
		rmSync(full, { recursive: true, force: true });
		removed++;
	}
}

// 2) Rewrite the manifest to list only surviving files.
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const before = Array.isArray(manifest.files) ? manifest.files.length : 0;
manifest.files = (manifest.files || []).filter(keep);
const after = manifest.files.length;
writeFileSync(MANIFEST, JSON.stringify(manifest));

console.log(`[prune-ilib] removed ${removed} locale/charset dirs; manifest files ${before} → ${after} (kept root + ${[...KEEP_DIRS].join(' + ')})`);
