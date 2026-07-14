'use strict';

// Luna services may be reclaimed between calls. Polling keeps this one alive
// while pairing is visible; ActivityManager covers gaps when available.

const Service = require('webos-service');
const pairing = require('./lib/pairing');
const serverLib = require('./lib/server');

const SERVICE_ID = 'com.seeky91.immichtv.service';
const BASE_PORT = 8788;
const PORT_TRIES = 5;

const service = new Service(SERVICE_ID);

let session = null;
let httpServer = null;
let httpPort = null;
let activity = null;

function holdActivity() {
	if (activity !== null) return;
	try {
		service.activityManager.create('pairing', function (a) {
			activity = a;
		});
	} catch (e) {
		// Polling alone keeps the service alive on firmwares without ActivityManager.
	}
}

function releaseActivity() {
	if (activity === null) return;
	try {
		service.activityManager.complete(activity);
	} catch (e) {
		// Local cleanup must continue if ActivityManager rejects completion.
	}
	activity = null;
}

function teardown() {
	session = null;
	releaseActivity();
	if (httpServer !== null) {
		try {
			httpServer.close();
		} catch (e) {
			// Clear local state even if the server is already closed.
		}
		httpServer = null;
		httpPort = null;
	}
}

function ensureServer() {
	if (httpServer !== null) return Promise.resolve(httpPort);
	const server = serverLib.createPairingServer({
		getSession: function () {
			return session;
		}
	});
	return serverLib.listenOnFreePort(server, BASE_PORT, PORT_TRIES).then(function (port) {
		server.on('error', function (err) {
			console.error('[pairing] http server error', err);
		});
		httpServer = server;
		httpPort = port;
		return port;
	});
}

service.register('start', function (message) {
	const params = message.payload || {};
	const now = Date.now();
	// Reuse a pending session so remounting cannot invalidate a code being entered.
	if (pairing.statusOf(session, now) !== 'pending') {
		session = pairing.createSession(now, {suggestedUrl: params.suggestedUrl});
	}
	ensureServer().then(
		function (port) {
			const url = serverLib.buildPairingUrl(serverLib.lanIp(), port, session);
			if (!url) {
				teardown();
				message.respond({returnValue: false, errorText: 'TV has no network address'});
				return;
			}
			holdActivity();
			message.respond({
				returnValue: true,
				url: url,
				code: session.code,
				port: port,
				nodeVersion: process.version
			});
		},
		function (err) {
			teardown();
			message.respond({returnValue: false, errorText: 'Could not start pairing server: ' + err.message});
		}
	);
});

service.register('status', function (message) {
	const state = pairing.statusOf(session, Date.now());
	if (state === 'approved') {
		const result = pairing.consumeResult(session);
		message.respond({returnValue: true, state: 'approved', result: result});
		teardown();
		return;
	}
	if (state === 'expired') {
		teardown();
		message.respond({returnValue: true, state: 'expired'});
		return;
	}
	message.respond({returnValue: true, state: state});
});

service.register('cancel', function (message) {
	teardown();
	message.respond({returnValue: true});
});
