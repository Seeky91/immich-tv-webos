'use strict';

// Server-side Immich login proxy. The phone page can't call Immich directly:
// its origin is the TV's pairing server, so the browser enforces CORS. Node
// has no CORS and can also accept self-signed certificates.

const http = require('http');
const https = require('https');
const Buffer = require('buffer').Buffer;
const Url = require('url').URL;

const REQUEST_TIMEOUT_MS = 15000;

function normalizeBaseUrl(raw) {
	return String(raw || '').trim().replace(/\/+$/, '');
}

// Mirrors APIClient's normalization (src/api/client.ts) so stored accounts
// behave identically whether they were added on the TV or via the phone.
function apiUrl(base) {
	const b = normalizeBaseUrl(base);
	return /\/api$/.test(b) ? b : b + '/api';
}

function postJson(urlString, body) {
	return new Promise(function (resolve, reject) {
		let u;
		try {
			u = new Url(urlString);
		} catch (e) {
			reject(new Error('invalid_url'));
			return;
		}
		const isHttps = u.protocol === 'https:';
		if (!isHttps && u.protocol !== 'http:') {
			reject(new Error('invalid_url'));
			return;
		}
		const payload = Buffer.from(JSON.stringify(body), 'utf8');
		const options = {
			hostname: u.hostname,
			port: u.port ? Number(u.port) : isHttps ? 443 : 80,
			path: u.pathname + u.search,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': payload.length,
				Accept: 'application/json'
			}
		};
		if (isHttps) options.rejectUnauthorized = false;
		const req = (isHttps ? https : http).request(options, function (res) {
			let data = '';
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				data += chunk;
			});
			res.on('end', function () {
				let json = null;
				try {
					json = data ? JSON.parse(data) : null;
				} catch (e) {
					// Non-JSON body (proxy error page, …): status alone decides.
				}
				resolve({status: res.statusCode, json: json});
			});
		});
		req.on('error', reject);
		req.setTimeout(REQUEST_TIMEOUT_MS, function () {
			req.destroy(new Error('timeout'));
		});
		req.write(payload);
		req.end();
	});
}

// Resolves {ok: true, accessToken} or {ok: false, error: <user-facing message>}.
// Never rejects; the password is used for this one call and never stored.
function login(serverUrl, email, password) {
	const base = normalizeBaseUrl(serverUrl);
	if (!/^https?:\/\//.test(base)) {
		return Promise.resolve({ok: false, error: 'Server URL must start with http:// or https://'});
	}
	return postJson(apiUrl(base) + '/auth/login', {email: email, password: password}).then(
		function (res) {
			if (res.status === 200 || res.status === 201) {
				const token = res.json && res.json.accessToken;
				if (token) return {ok: true, accessToken: token};
				return {ok: false, error: 'Unexpected response from the Immich server'};
			}
			if (res.status === 401) return {ok: false, error: 'Invalid email or password'};
			return {ok: false, error: 'Immich server returned ' + res.status};
		},
		function (err) {
			if (err && err.message === 'timeout') {
				return {ok: false, error: 'The Immich server did not respond in time'};
			}
			if (err && err.message === 'invalid_url') {
				return {ok: false, error: 'Invalid server URL'};
			}
			return {ok: false, error: "Couldn't reach the Immich server from the TV. Check the URL."};
		}
	);
}

module.exports = {login, normalizeBaseUrl, apiUrl, postJson, REQUEST_TIMEOUT_MS};
