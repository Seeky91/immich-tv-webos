import {AuthMethod} from '../api/types';
import {deriveLabel, pickGradient, GRADIENT_PALETTE} from './accountVisual';
import type {Account} from './accountsStore';

const make = (over: Partial<Account>): Account => ({
	id: 'id',
	baseUrl: 'http://x',
	method: AuthMethod.API_KEY,
	addedAt: 0,
	...over,
});

describe('deriveLabel', () => {
	test('USER_CREDENTIALS uses email', () => {
		expect(deriveLabel(make({method: AuthMethod.USER_CREDENTIALS, email: 'marie@example.com'}))).toBe(
			'marie@example.com',
		);
	});

	test('USER_CREDENTIALS falls back to baseUrl host if email missing', () => {
		expect(deriveLabel(make({method: AuthMethod.USER_CREDENTIALS, baseUrl: 'https://immich.home.local'}))).toBe(
			'immich.home.local',
		);
	});

	test('API_KEY uses baseUrl host', () => {
		expect(deriveLabel(make({method: AuthMethod.API_KEY, baseUrl: 'https://immich.home.local:2283'}))).toBe(
			'immich.home.local',
		);
	});

	test('API_KEY tolerates baseUrl without scheme', () => {
		expect(deriveLabel(make({method: AuthMethod.API_KEY, baseUrl: '192.168.1.42:2283'}))).toBe('192.168.1.42');
	});
});

describe('pickGradient', () => {
	test('returns a member of the palette', () => {
		expect(GRADIENT_PALETTE).toContain(pickGradient('any-id'));
	});

	test('is deterministic for the same id', () => {
		expect(pickGradient('abc')).toBe(pickGradient('abc'));
	});

	test('produces different gradients for different ids (at least sometimes)', () => {
		const seen = new Set<string>();
		for (let i = 0; i < 50; i++) seen.add(pickGradient(`id-${i}`));
		expect(seen.size).toBeGreaterThan(1);
	});
});
