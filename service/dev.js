'use strict';

// Standalone dev harness: the same pairing server plus HTTP control routes
// standing in for the luna bus, so the app (HttpPairingDriver) and e2e tests
// can drive pairing on a desktop. Never runs on the TV.
//
//   node service/dev.js [port]

const pairing = require('./lib/pairing');
const serverLib = require('./lib/server');

const basePort = Number(process.argv[2]) || 8788;

let session = null;

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

let listeningPort = null;

function pairingUrl() {
	const host = serverLib.lanIp() || '127.0.0.1';
	let url = 'http://' + host + ':' + listeningPort + '/?c=' + session.code;
	if (session.suggestedUrl) url += '&u=' + encodeURIComponent(session.suggestedUrl);
	return url;
}

function controlRoutes(req, res, pathname) {
	if (req.method === 'OPTIONS') {
		res.writeHead(204, CORS_HEADERS);
		res.end();
		return true;
	}
	if (req.method !== 'POST' || pathname.indexOf('/pairing/') !== 0) return false;

	if (pathname === '/pairing/start') {
		serverLib.readBody(req).then(function (raw) {
			let params = {};
			try {
				params = JSON.parse(raw) || {};
			} catch (e) {
				// Empty body is fine.
			}
			const now = Date.now();
			if (pairing.statusOf(session, now) !== 'pending') {
				session = pairing.createSession(now, {suggestedUrl: params.suggestedUrl});
			}
			serverLib.sendJson(
				res,
				200,
				{returnValue: true, url: pairingUrl(), code: session.code, port: listeningPort, nodeVersion: process.version},
				CORS_HEADERS
			);
		});
		return true;
	}
	if (pathname === '/pairing/status') {
		const state = pairing.statusOf(session, Date.now());
		if (state === 'approved') {
			const result = pairing.consumeResult(session);
			serverLib.sendJson(res, 200, {returnValue: true, state: 'approved', result: result}, CORS_HEADERS);
		} else {
			serverLib.sendJson(res, 200, {returnValue: true, state: state}, CORS_HEADERS);
		}
		return true;
	}
	if (pathname === '/pairing/cancel') {
		session = null;
		serverLib.sendJson(res, 200, {returnValue: true}, CORS_HEADERS);
		return true;
	}
	return false;
}

const server = serverLib.createPairingServer({
	getSession: function () {
		return session;
	},
	extraRoutes: controlRoutes
});

serverLib.listenOnFreePort(server, basePort, 5).then(
	function (port) {
		listeningPort = port;
		console.log('[pairing-dev] listening on http://127.0.0.1:' + port + ' (node ' + process.version + ')');
	},
	function (err) {
		console.error('[pairing-dev] failed to listen:', err.message);
		process.exit(1);
	}
);
