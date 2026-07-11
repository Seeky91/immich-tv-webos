'use strict';

// Phone-facing HTTP server. Exposes only the sign-in page and POST /approve;
// session control (start/status/cancel) stays on the luna bus on the TV, or
// on dev.js control routes on a desktop.

/* global __dirname */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Buffer = require('buffer').Buffer;
const pairing = require('./pairing');
const immich = require('./immich');

const MAX_BODY_BYTES = 16 * 1024;

let pageCache = null;
function verifyPage() {
	if (pageCache === null) {
		pageCache = fs.readFileSync(path.join(__dirname, '..', 'verify.html'));
	}
	return pageCache;
}

function lanIp() {
	const interfaces = os.networkInterfaces();
	const names = Object.keys(interfaces);
	for (let i = 0; i < names.length; i++) {
		const addresses = interfaces[names[i]] || [];
		for (let j = 0; j < addresses.length; j++) {
			const addr = addresses[j];
			if (addr.family === 'IPv4' && !addr.internal) return addr.address;
		}
	}
	return null;
}

function readBody(req) {
	return new Promise(function (resolve, reject) {
		let size = 0;
		const chunks = [];
		req.on('data', function (chunk) {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new Error('body_too_large'));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', function () {
			resolve(Buffer.concat(chunks).toString('utf8'));
		});
		req.on('error', reject);
	});
}

function sendJson(res, status, body, extraHeaders) {
	const payload = Buffer.from(JSON.stringify(body), 'utf8');
	const headers = {'Content-Type': 'application/json', 'Content-Length': payload.length};
	const extra = extraHeaders || {};
	Object.keys(extra).forEach(function (key) {
		headers[key] = extra[key];
	});
	res.writeHead(status, headers);
	res.end(payload);
}

// context: {getSession(), now(), extraRoutes?: (req, res, pathname) => boolean}.
// extraRoutes lets dev.js graft its control endpoints onto the same server.
function createPairingServer(context) {
	const now = context.now || Date.now;

	function handleApprove(req, res) {
		readBody(req)
			.then(function (raw) {
				let body = null;
				try {
					body = JSON.parse(raw);
				} catch (e) {
					// Falls through to the invalid-request branch below.
				}
				if (!body || !body.serverUrl || !body.email || !body.password) {
					sendJson(res, 400, {ok: false, error: 'Fill in every field'});
					return;
				}
				const session = context.getSession();
				const codeStatus = pairing.checkCode(session, now(), body.code);
				if (codeStatus !== 'ok') {
					const message =
						codeStatus === 'bad_code'
							? "That code doesn't match the one on the TV"
							: 'This pairing session has expired. Start again on the TV.';
					sendJson(res, 400, {ok: false, error: message});
					return;
				}
				// Wrong password must not burn the session: login first, approve after.
				immich.login(body.serverUrl, body.email, body.password).then(function (login) {
					if (!login.ok) {
						sendJson(res, 401, {ok: false, error: login.error});
						return;
					}
					pairing.markApproved(session, now(), {
						baseUrl: immich.normalizeBaseUrl(body.serverUrl),
						email: String(body.email),
						accessToken: login.accessToken
					});
					sendJson(res, 200, {ok: true});
				});
			})
			.catch(function () {
				sendJson(res, 400, {ok: false, error: 'Invalid request'});
			});
	}

	const server = http.createServer(function (req, res) {
		const pathname = String(req.url || '/').split('?')[0];
		if (context.extraRoutes && context.extraRoutes(req, res, pathname)) return;
		if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
			res.end(verifyPage());
			return;
		}
		if (req.method === 'POST' && pathname === '/approve') {
			handleApprove(req, res);
			return;
		}
		sendJson(res, 404, {ok: false, error: 'Not found'});
	});

	return server;
}

// Binds to the first free port of [basePort, basePort + tries).
function listenOnFreePort(server, basePort, tries) {
	return new Promise(function (resolve, reject) {
		let attempt = 0;
		function tryListen() {
			const port = basePort + attempt;
			server.once('error', function (err) {
				if (err && err.code === 'EADDRINUSE' && attempt + 1 < tries) {
					attempt += 1;
					tryListen();
					return;
				}
				reject(err);
			});
			server.listen(port, '0.0.0.0', function () {
				server.removeAllListeners('error');
				resolve(port);
			});
		}
		tryListen();
	});
}

module.exports = {createPairingServer, listenOnFreePort, sendJson, readBody, lanIp};
