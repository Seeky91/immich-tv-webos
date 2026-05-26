import {randomId} from './uuid';

describe('randomId', () => {
	test('returns a v4-shaped uuid string', () => {
		const id = randomId();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	test('returns distinct values on consecutive calls', () => {
		const a = randomId();
		const b = randomId();
		expect(a).not.toBe(b);
	});

	test('falls back to Math.random when crypto.randomUUID is missing', () => {
		const realCrypto = globalThis.crypto;
		globalThis.crypto = {} as Crypto;
		try {
			const id = randomId();
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		} finally {
			globalThis.crypto = realCrypto;
		}
	});
});
