'use strict';

// Target runtime is the TV's Node 8 (webOS 5/6): no ??/?. operators here.

const CODE_LENGTH = 8;
// No 0/O/1/I/L to keep the code unambiguous when read from the TV screen.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_FAILURES = 10;

function generateCode(randomFn) {
	const rand = randomFn || Math.random;
	let code = '';
	for (let i = 0; i < CODE_LENGTH; i++) {
		code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
	}
	return code;
}

function createSession(now, options) {
	const opts = options || {};
	return {
		code: generateCode(opts.randomFn),
		suggestedUrl: opts.suggestedUrl || '',
		expiresAt: now + SESSION_TTL_MS,
		state: 'pending',
		codeFailures: 0,
		result: null
	};
}

function statusOf(session, now) {
	if (!session) return 'none';
	if (session.state === 'approved') return 'approved';
	if (session.state === 'consumed') return 'consumed';
	if (now >= session.expiresAt) return 'expired';
	return 'pending';
}

// Expire repeated failures to limit brute-force attempts over the LAN.
function checkCode(session, now, code) {
	const status = statusOf(session, now);
	if (status !== 'pending') return status === 'expired' || status === 'none' ? 'expired' : 'not_pending';
	const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
	if (normalized !== session.code) {
		session.codeFailures += 1;
		if (session.codeFailures >= MAX_CODE_FAILURES) session.expiresAt = now;
		return 'bad_code';
	}
	return 'ok';
}

function markApproved(session, now, result) {
	if (statusOf(session, now) !== 'pending') return false;
	session.state = 'approved';
	session.result = result;
	return true;
}

// Drop credentials from memory after their first delivery.
function consumeResult(session) {
	if (!session || session.state !== 'approved') return null;
	const result = session.result;
	session.state = 'consumed';
	session.result = null;
	return result;
}

module.exports = {
	createSession,
	statusOf,
	checkCode,
	markApproved,
	consumeResult,
	CODE_LENGTH,
	CODE_ALPHABET,
	SESSION_TTL_MS,
	MAX_CODE_FAILURES
};
