'use strict';

// Plain-node test suite for the pairing service (no Jest: this code targets
// the TV's Node 8 and must stay runnable there).  Run: node service/test.js

const assert = require('assert');
const http = require('http');
const pairing = require('./lib/pairing');
const immich = require('./lib/immich');
const serverLib = require('./lib/server');

const tests = [];
function test(name, fn) {
	tests.push({name: name, fn: fn});
}

function postJson(port, path, body) {
	return immich.postJson('http://127.0.0.1:' + port + path, body);
}

/* ── pairing.js ── */

test('session lifecycle: pending → approved → consumed', function () {
	const t0 = 1000;
	const session = pairing.createSession(t0);
	assert.strictEqual(pairing.statusOf(session, t0), 'pending');
	assert.strictEqual(session.code.length, pairing.CODE_LENGTH);

	assert.strictEqual(pairing.checkCode(session, t0, 'WRONGCOD'), 'bad_code');
	assert.strictEqual(pairing.checkCode(session, t0, session.code), 'ok');
	assert.strictEqual(pairing.checkCode(session, t0, session.code.toLowerCase()), 'ok');

	assert.ok(pairing.markApproved(session, t0, {email: 'a@b.c'}));
	assert.strictEqual(pairing.statusOf(session, t0), 'approved');
	assert.strictEqual(pairing.checkCode(session, t0, session.code), 'not_pending');

	const result = pairing.consumeResult(session);
	assert.strictEqual(result.email, 'a@b.c');
	assert.strictEqual(pairing.consumeResult(session), null, 'result is single-delivery');
	assert.strictEqual(pairing.statusOf(session, t0), 'consumed');
});

test('session expires by time', function () {
	const t0 = 1000;
	const session = pairing.createSession(t0);
	const later = t0 + pairing.SESSION_TTL_MS;
	assert.strictEqual(pairing.statusOf(session, later), 'expired');
	assert.strictEqual(pairing.checkCode(session, later, session.code), 'expired');
	assert.strictEqual(pairing.markApproved(session, later, {}), false);
});

test('repeated bad codes burn the session', function () {
	const t0 = 1000;
	const session = pairing.createSession(t0);
	for (let i = 0; i < pairing.MAX_CODE_FAILURES; i++) {
		pairing.checkCode(session, t0, 'XXXXXXXX');
	}
	assert.strictEqual(pairing.statusOf(session, t0), 'expired');
});

test('no session behaves as expired', function () {
	assert.strictEqual(pairing.statusOf(null, 0), 'none');
	assert.strictEqual(pairing.checkCode(null, 0, 'ANYTHING'), 'expired');
});

test('codes avoid ambiguous characters', function () {
	assert.ok(!/[0O1IL]/.test(pairing.CODE_ALPHABET));
});

/* ── immich.js ── */

test('apiUrl mirrors APIClient normalization', function () {
	assert.strictEqual(immich.apiUrl('https://x.com'), 'https://x.com/api');
	assert.strictEqual(immich.apiUrl('https://x.com/'), 'https://x.com/api');
	assert.strictEqual(immich.apiUrl('https://x.com/api'), 'https://x.com/api');
	assert.strictEqual(immich.apiUrl('  https://x.com//  '), 'https://x.com/api');
});

test('login rejects non-http URLs without a network call', function () {
	return immich.login('ftp://x', 'a', 'b').then(function (res) {
		assert.strictEqual(res.ok, false);
		assert.ok(/http/.test(res.error));
	});
});

/* ── end-to-end against a stub Immich ── */

function withServers(stubHandler, body) {
	let session = null;
	const stub = http.createServer(stubHandler);
	const pairingServer = serverLib.createPairingServer({
		getSession: function () {
			return session;
		}
	});
	return new Promise(function (resolve) {
		stub.listen(0, '127.0.0.1', function () {
			pairingServer.listen(0, '127.0.0.1', function () {
				resolve({
					stubPort: stub.address().port,
					pairingPort: pairingServer.address().port,
					setSession: function (s) {
						session = s;
					}
				});
			});
		});
	}).then(function (ctx) {
		return Promise.resolve(body(ctx)).then(
			function () {
				stub.close();
				pairingServer.close();
			},
			function (err) {
				stub.close();
				pairingServer.close();
				throw err;
			}
		);
	});
}

test('approve: full happy path stores token and pending→approved', function () {
	return withServers(
		function (req, res) {
			assert.strictEqual(req.url, '/api/auth/login');
			res.writeHead(201, {'Content-Type': 'application/json'});
			res.end(JSON.stringify({accessToken: 'tok123'}));
		},
		function (ctx) {
			const session = pairing.createSession(Date.now());
			ctx.setSession(session);
			return postJson(ctx.pairingPort, '/approve', {
				code: session.code,
				serverUrl: 'http://127.0.0.1:' + ctx.stubPort,
				email: 'q@e.fr',
				password: 'secret'
			}).then(function (res) {
				assert.strictEqual(res.status, 200);
				assert.strictEqual(res.json.ok, true);
				const result = pairing.consumeResult(session);
				assert.strictEqual(result.accessToken, 'tok123');
				assert.strictEqual(result.email, 'q@e.fr');
				assert.strictEqual(result.baseUrl, 'http://127.0.0.1:' + ctx.stubPort);
			});
		}
	);
});

test('approve: wrong password leaves the session pending for a retry', function () {
	return withServers(
		function (req, res) {
			res.writeHead(401);
			res.end('{}');
		},
		function (ctx) {
			const session = pairing.createSession(Date.now());
			ctx.setSession(session);
			return postJson(ctx.pairingPort, '/approve', {
				code: session.code,
				serverUrl: 'http://127.0.0.1:' + ctx.stubPort,
				email: 'q@e.fr',
				password: 'nope'
			}).then(function (res) {
				assert.strictEqual(res.status, 401);
				assert.ok(/Invalid email or password/.test(res.json.error));
				assert.strictEqual(pairing.statusOf(session, Date.now()), 'pending');
			});
		}
	);
});

test('approve: wrong code never reaches Immich', function () {
	return withServers(
		function () {
			throw new Error('stub must not be called');
		},
		function (ctx) {
			const session = pairing.createSession(Date.now());
			ctx.setSession(session);
			return postJson(ctx.pairingPort, '/approve', {
				code: 'WRONGCOD',
				serverUrl: 'http://127.0.0.1:' + ctx.stubPort,
				email: 'q@e.fr',
				password: 'x'
			}).then(function (res) {
				assert.strictEqual(res.status, 400);
				assert.ok(/doesn't match/.test(res.json.error));
			});
		}
	);
});

test('approve: missing fields → 400', function () {
	return withServers(
		function () {},
		function (ctx) {
			return postJson(ctx.pairingPort, '/approve', {code: 'X'}).then(function (res) {
				assert.strictEqual(res.status, 400);
			});
		}
	);
});

test('GET / serves the sign-in page', function () {
	return withServers(
		function () {},
		function (ctx) {
			return new Promise(function (resolve, reject) {
				http.get('http://127.0.0.1:' + ctx.pairingPort + '/?c=ABCD2345', function (res) {
					let data = '';
					res.on('data', function (c) {
						data += c;
					});
					res.on('end', function () {
						try {
							assert.strictEqual(res.statusCode, 200);
							assert.ok(/Sign in to your TV/.test(data));
							resolve();
						} catch (e) {
							reject(e);
						}
					});
				});
			});
		}
	);
});

/* ── runner ── */

let failed = 0;
function run(index) {
	if (index >= tests.length) {
		console.log(failed === 0 ? '\nAll ' + tests.length + ' tests passed' : '\n' + failed + ' test(s) FAILED');
		process.exit(failed === 0 ? 0 : 1);
	}
	const t = tests[index];
	Promise.resolve()
		.then(function () {
			return t.fn();
		})
		.then(
			function () {
				console.log('  ok  ' + t.name);
				run(index + 1);
			},
			function (err) {
				failed += 1;
				console.error('FAIL  ' + t.name);
				console.error('      ' + (err && err.message));
				run(index + 1);
			}
		);
}
run(0);
