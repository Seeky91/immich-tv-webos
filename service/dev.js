'use strict';

// Desktop-only stand-in for the Luna bus, sharing the production pairing server
// so the app and end-to-end tests exercise the same protocol.

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
				// Start requests may omit the optional suggested URL.
			}
			const now = Date.now();
			if (pairing.statusOf(session, now) !== 'pending') {
				session = pairing.createSession(now, {suggestedUrl: params.suggestedUrl});
			}
			const url = serverLib.buildPairingUrl(serverLib.lanIp() || '127.0.0.1', listeningPort, session);
			serverLib.sendJson(
				res,
				200,
				{returnValue: true, url: url, code: session.code, port: listeningPort, nodeVersion: process.version},
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
