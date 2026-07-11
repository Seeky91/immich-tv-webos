'use strict';

// Pairing session state machine. Pure logic, no I/O — exercised by service/test.js.
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
		state: 'pending', // pending | approved | consumed
		codeFailures: 0,
		result: null // {baseUrl, email, accessToken} once approved
	};
}

function statusOf(session, now) {
	if (!session) return 'none';
	if (session.state === 'approved') return 'approved';
	if (session.state === 'consumed') return 'consumed';
	if (now >= session.expiresAt) return 'expired';
	return 'pending';
}

// Validates a code typed/scanned on the phone. Repeated failures burn the
// session so the 8-char code can't be brute-forced over the LAN.
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

// Single delivery: the result is handed out once, then dropped from memory.
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
	generateCode,
	CODE_LENGTH,
	CODE_ALPHABET,
	SESSION_TTL_MS,
	MAX_CODE_FAILURES
};
