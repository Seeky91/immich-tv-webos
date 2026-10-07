#!/usr/bin/env node
// Prunes the iLib locale data the app can never request from dist/ before packaging.
//
// Enact's ILibPlugin (@enact/dev-utils) copies the FULL ilib-webos locale tree
// (~6500 files / ~74MB) into dist/node_modules/ilib/locale on every `enact pack`.
// Two rules decide what ships:
//
// 1. Locales. The app UI is English-only, so only the root fallback data + `en/` + `und/`
//    (region data, for any country) are kept. Every other language goes, along with the
//    charmaps/, charset/, nf*/ and zoneinfo/ dirs (webOS reads time zones from the system).
// 2. Data kinds. ilib reads locale data only through Utils.loadData({name}), called by the
//    ilib classes bundled into the app. A file ships only if a call site in the bundle can
//    ask for its name: literally ("localeinfo.json"), or through ResBundle, which appends
//    ".json" to the name it is given (name:"sysres"). Data of ilib classes the app does not
//    bundle (addresses, phone numbers, units, country names…) is dropped, and comes back on
//    its own if one of those classes gets bundled. A call site naming its file any other
//    way fails the build rather than shipping without the data it builds a path to.
//
// Why rewrite the manifest and not just delete files: @enact/i18n's Loader gates
// every fetch on manifest membership (isAvailable), and treats an ABSENT manifest as
// "load everything in this dir" — so leaving the manifest listing now-deleted files
// (or removing it entirely) makes ilib XHR the missing files at runtime and 404-spam.
// The manifest must list exactly what remains on disk. Absent locales then degrade
// gracefully to ilib's inlined LocaleInfo.defaultInfo (no throw).
//
// Runs in pack-p AFTER transpile-legacy.mjs (it reads the final bundle) and BEFORE
// ares-package. Idempotent.

import { readdirSync, rmSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const LOCALE_DIR = join(DIST, 'node_modules/ilib/locale');
const MANIFEST_NAME = 'ilibmanifest.json';
const MANIFEST = join(LOCALE_DIR, MANIFEST_NAME);
const KEEP_DIRS = new Set(['en', 'und']);

// The two loadData names that are not a plain "<file>.json" literal in ilib-webos.
const RESBUNDLE_NAME = 'this.baseName+".json"';
const TIMEZONE_NAME = /^"zoneinfo\/"\+/; // zone files: read from the platform on webOS, zoneinfo/ is not shipped

const fail = (message) => {
	console.error(`[prune-ilib] ${message}`);
	process.exit(1);
};

if (!existsSync(MANIFEST)) {
	fail(`missing input: ${MANIFEST} (did enact pack run?)`);
}

// Names (relative to a locale dir) that the bundled ilib code can pass to loadData.
function loadableDataNames(bundle) {
	const callCount = bundle.split('.loadData(').length - 1;
	const names = new Set();
	let usesResBundle = false;
	let parsed = 0;
	for (const [, rawName] of bundle.matchAll(/\.loadData\(\{[^{}]*?\bname:([^,{}]+)/g)) {
		parsed++;
		const name = rawName.replace(/\s+/g, '');
		const literal = /^"([^"]+\.json)"$/.exec(name);
		if (literal) names.add(literal[1]);
		else if (name === RESBUNDLE_NAME) usesResBundle = true;
		else if (!TIMEZONE_NAME.test(name)) fail(`unrecognised ilib data name \`${name}\`: teach this script which files it can load`);
	}
	if (parsed === 0 || parsed !== callCount) {
		fail(`found ${callCount} ilib loadData calls but could read the file name of ${parsed}: update the pattern in this script`);
	}
	if (usesResBundle) {
		for (const [, base] of bundle.matchAll(/\bname:"([\w-]+)"/g)) names.add(`${base}.json`);
	}
	return names;
}

function listFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? listFiles(full) : [full];
	});
}

// Removes empty directories below `dir`; returns whether `dir` itself ended up empty.
function removeEmptyDirs(dir) {
	const remaining = readdirSync(dir, { withFileTypes: true }).filter(
		(entry) => !entry.isDirectory() || !removeEmptyDirs(join(dir, entry.name)),
	);
	if (remaining.length === 0) rmSync(dir, { recursive: true });
	return remaining.length === 0;
}

const bundleSource = readdirSync(DIST)
	.filter((file) => file.endsWith('.js'))
	.map((file) => readFileSync(join(DIST, file), 'utf8'))
	.join('\n');
const dataNames = loadableDataNames(bundleSource);

// Single source of truth for the disk deletion and the manifest rewrite below.
// `rel` is relative to the locale root: "<file>" at the root, "<locale path>/<file>" below it.
const inKeptLocale = (rel) => !rel.includes('/') || KEEP_DIRS.has(rel.split('/')[0]);
const isLoadable = (rel) => [...dataNames].some((name) => rel === name || rel.endsWith(`/${name}`));
const keep = (rel) => inKeptLocale(rel) && isLoadable(rel);

let bytesBefore = 0;
let bytesAfter = 0;
for (const file of listFiles(LOCALE_DIR)) {
	const rel = relative(LOCALE_DIR, file);
	if (rel === MANIFEST_NAME) continue;
	const { size } = statSync(file);
	bytesBefore += size;
	if (keep(rel)) bytesAfter += size;
	else rmSync(file);
}
removeEmptyDirs(LOCALE_DIR);

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const before = manifest.files.length;
manifest.files = manifest.files.filter(keep);
writeFileSync(MANIFEST, JSON.stringify(manifest));

const onDisk = listFiles(LOCALE_DIR)
	.map((file) => relative(LOCALE_DIR, file))
	.filter((rel) => rel !== MANIFEST_NAME);
const listed = new Set(manifest.files);
if (onDisk.length !== listed.size || onDisk.some((rel) => !listed.has(rel))) {
	fail(`${MANIFEST_NAME} lists ${listed.size} files but ${onDisk.length} remain on disk`);
}

const mb = (bytes) => (bytes / 1e6).toFixed(1);
const shippedKinds = new Set(manifest.files.map((rel) => rel.split('/').pop()));
console.log(`[prune-ilib] kept root + ${[...KEEP_DIRS].join(' + ')}, data kinds the bundle can load: ${[...shippedKinds].sort().join(', ')}`);
console.log(`[prune-ilib] manifest files ${before} → ${manifest.files.length}, ${mb(bytesBefore)} MB → ${mb(bytesAfter)} MB`);
