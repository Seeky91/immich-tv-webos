#!/usr/bin/env node
// Generates a webosbrew-compatible manifest.json from a built .ipk.
// Schema reference: https://github.com/webosbrew/webos-app-manifest

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

const [, , ipkPath, outputPath] = process.argv;
if (!ipkPath || !outputPath) {
	console.error('Usage: build-manifest.mjs <ipk-path> <output-path>');
	process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
const ref = process.env.GITHUB_REF_NAME;
if (!repo || !ref) {
	console.error('GITHUB_REPOSITORY and GITHUB_REF_NAME must be set');
	process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const appinfo = JSON.parse(readFileSync('webos-meta/appinfo.json', 'utf8'));

const ipkBuffer = readFileSync(ipkPath);
const sha256 = createHash('sha256').update(ipkBuffer).digest('hex');
const size = statSync(ipkPath).size;
const ipkName = basename(ipkPath);

const manifest = {
	id: appinfo.id,
	title: appinfo.title,
	version: appinfo.version,
	type: appinfo.type,
	appDescription: pkg.description,
	iconUri: `https://raw.githubusercontent.com/${repo}/main/assets/icon-store.png`,
	sourceUrl: `https://github.com/${repo}`,
	rootRequired: false,
	ipkUrl: `https://github.com/${repo}/releases/download/${ref}/${ipkName}`,
	ipkHash: { sha256 },
	ipkSize: size
};

writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify(manifest, null, 2));
