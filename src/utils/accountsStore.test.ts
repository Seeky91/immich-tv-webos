import {AuthMethod} from '../api/types';
import {
	readAccountsStore,
	writeAccountsStore,
	addAccountToStore,
	removeAccountFromStore,
	setDefaultInStore,
	setLastActiveInStore,
	type AccountsStore,
	type Account,
} from './accountsStore';

const ACCOUNTS_KEY = 'immich_accounts';
const LEGACY_KEY = 'immich_auth_config';

beforeEach(() => {
	localStorage.clear();
});

describe('readAccountsStore', () => {
	test('returns empty store when nothing in localStorage', () => {
		const store = readAccountsStore();
		expect(store).toEqual({version: 2, accounts: [], defaultAccountId: null, lastActiveAccountId: null});
	});

	test('returns the parsed store when present and valid', () => {
		const acc: Account = {
			id: 'abc',
			baseUrl: 'http://x',
			method: AuthMethod.API_KEY,
			apiKey: 'k',
			addedAt: 123,
		};
		localStorage.setItem(
			ACCOUNTS_KEY,
			JSON.stringify({version: 2, accounts: [acc], defaultAccountId: null, lastActiveAccountId: 'abc'}),
		);
		expect(readAccountsStore()).toEqual({
			version: 2,
			accounts: [acc],
			defaultAccountId: null,
			lastActiveAccountId: 'abc',
		});
	});

	test('migrates legacy USER_CREDENTIALS singleton into a one-account store', () => {
		localStorage.setItem(
			LEGACY_KEY,
			JSON.stringify({
				baseUrl: 'http://legacy',
				method: AuthMethod.USER_CREDENTIALS,
				email: 'old@example.com',
				accessToken: 'tok',
			}),
		);
		const store = readAccountsStore();
		expect(store.accounts).toHaveLength(1);
		const migrated = store.accounts[0];
		if (!migrated) throw new Error('expected migrated account');
		expect(migrated.baseUrl).toBe('http://legacy');
		expect(migrated.email).toBe('old@example.com');
		expect(migrated.accessToken).toBe('tok');
		expect(migrated.method).toBe(AuthMethod.USER_CREDENTIALS);
		expect(typeof migrated.id).toBe('string');
		expect(store.defaultAccountId).toBe(migrated.id);
		expect(store.lastActiveAccountId).toBe(migrated.id);
		expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
		expect(localStorage.getItem(ACCOUNTS_KEY)).not.toBeNull();
	});

	test('migrates legacy API_KEY singleton into a one-account store', () => {
		localStorage.setItem(
			LEGACY_KEY,
			JSON.stringify({baseUrl: 'http://k', method: AuthMethod.API_KEY, apiKey: 'kk'}),
		);
		const store = readAccountsStore();
		expect(store.accounts).toHaveLength(1);
		const first = store.accounts[0];
		if (!first) throw new Error('expected migrated account');
		expect(first.apiKey).toBe('kk');
		expect(first.method).toBe(AuthMethod.API_KEY);
	});

	test('discards invalid legacy entry and returns empty store', () => {
		localStorage.setItem(LEGACY_KEY, '{not json');
		const store = readAccountsStore();
		expect(store.accounts).toEqual([]);
	});
});

describe('mutators', () => {
	const base: AccountsStore = {version: 2, accounts: [], defaultAccountId: null, lastActiveAccountId: null};
	const a: Account = {id: 'a', baseUrl: 'http://a', method: AuthMethod.API_KEY, apiKey: 'ka', addedAt: 1};
	const b: Account = {id: 'b', baseUrl: 'http://b', method: AuthMethod.API_KEY, apiKey: 'kb', addedAt: 2};

	test('addAccountToStore appends and sets lastActive', () => {
		const next = addAccountToStore(base, a);
		expect(next.accounts).toEqual([a]);
		expect(next.lastActiveAccountId).toBe('a');
		expect(next.defaultAccountId).toBeNull();
	});

	test('addAccountToStore preserves existing default', () => {
		const initial = {...base, accounts: [a], defaultAccountId: 'a', lastActiveAccountId: 'a'};
		const next = addAccountToStore(initial, b);
		expect(next.defaultAccountId).toBe('a');
		expect(next.lastActiveAccountId).toBe('b');
	});

	test('removeAccountFromStore drops the account and clears defaults pointing at it', () => {
		const initial: AccountsStore = {
			version: 2,
			accounts: [a, b],
			defaultAccountId: 'a',
			lastActiveAccountId: 'a',
		};
		const next = removeAccountFromStore(initial, 'a');
		expect(next.accounts).toEqual([b]);
		expect(next.defaultAccountId).toBeNull();
		expect(next.lastActiveAccountId).toBe('b');
	});

	test('removeAccountFromStore on empty list leaves both ids null', () => {
		const initial: AccountsStore = {version: 2, accounts: [a], defaultAccountId: 'a', lastActiveAccountId: 'a'};
		const next = removeAccountFromStore(initial, 'a');
		expect(next.accounts).toEqual([]);
		expect(next.defaultAccountId).toBeNull();
		expect(next.lastActiveAccountId).toBeNull();
	});

	test('setDefaultInStore sets and clears', () => {
		const initial: AccountsStore = {version: 2, accounts: [a, b], defaultAccountId: null, lastActiveAccountId: 'a'};
		expect(setDefaultInStore(initial, 'b').defaultAccountId).toBe('b');
		expect(setDefaultInStore(initial, null).defaultAccountId).toBeNull();
	});

	test('setLastActiveInStore updates only that field', () => {
		const initial: AccountsStore = {version: 2, accounts: [a, b], defaultAccountId: 'a', lastActiveAccountId: 'a'};
		const next = setLastActiveInStore(initial, 'b');
		expect(next.lastActiveAccountId).toBe('b');
		expect(next.defaultAccountId).toBe('a');
	});
});

describe('writeAccountsStore', () => {
	test('serializes to localStorage', () => {
		const store: AccountsStore = {
			version: 2,
			accounts: [{id: 'x', baseUrl: 'http://x', method: AuthMethod.API_KEY, apiKey: 'k', addedAt: 7}],
			defaultAccountId: 'x',
			lastActiveAccountId: 'x',
		};
		writeAccountsStore(store);
		expect(JSON.parse(localStorage.getItem(ACCOUNTS_KEY)!)).toEqual(store);
	});
});
