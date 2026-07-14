'use strict';

// Proxy login through the TV because the phone page's origin is subject to CORS.
// Self-signed Immich certificates are accepted for private LAN servers.

const http = require('http');
const https = require('https');
const Buffer = require('buffer').Buffer;
const Url = require('url').URL;

const REQUEST_TIMEOUT_MS = 15000;

function normalizeBaseUrl(raw) {
	return String(raw || '').trim().replace(/\/+$/, '');
}

// Keep phone-paired accounts aligned with APIClient's base-URL normalization.
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
					// Proxy error pages may be non-JSON; the status is still sufficient.
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

// Failures resolve to user-facing errors; the password is never retained.
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

module.exports = {login, normalizeBaseUrl, apiUrl, postJson};
