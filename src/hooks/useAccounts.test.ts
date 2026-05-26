import {act, renderHook, waitFor} from '@testing-library/react';
import {AuthMethod} from '../api/types';
import type {Account} from '../utils/accountsStore';
import {useAccounts} from './useAccounts';

jest.mock('../api/ImmichRepository', () => {
	const actual = jest.requireActual('../api/ImmichRepository');
	return {
		...actual,
		validateAuth: jest.fn(async () => true),
	};
});

import {validateAuth} from '../api/ImmichRepository';

const mockValidate = validateAuth as jest.MockedFunction<typeof validateAuth>;

beforeEach(() => {
	localStorage.clear();
	mockValidate.mockReset();
	mockValidate.mockResolvedValue(true);
});

const seed = (
	accounts: Account[],
	extra: Partial<{defaultAccountId: string; lastActiveAccountId: string}> = {},
) => {
	localStorage.setItem(
		'immich_accounts',
		JSON.stringify({
			version: 2,
			accounts,
			defaultAccountId: extra.defaultAccountId ?? null,
			lastActiveAccountId: extra.lastActiveAccountId ?? accounts[0]?.id ?? null,
		}),
	);
};

describe('useAccounts initial state', () => {
	test('exposes empty list when no store', () => {
		const {result} = renderHook(() => useAccounts());
		expect(result.current.accounts).toEqual([]);
		expect(result.current.activeAccountId).toBeNull();
	});

	test('validates the active account on mount', async () => {
		const acc: Account = {id: 'a', baseUrl: 'http://a', method: AuthMethod.API_KEY, apiKey: 'k', addedAt: 1};
		seed([acc]);
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.repository).not.toBeNull());
		expect(result.current.activeAccountId).toBe('a');
	});

	test('keeps activeAccountId set but repository null on 401', async () => {
		mockValidate.mockResolvedValue(false);
		const acc: Account = {id: 'a', baseUrl: 'http://a', method: AuthMethod.API_KEY, apiKey: 'k', addedAt: 1};
		seed([acc]);
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.isValidating).toBe(false));
		expect(result.current.repository).toBeNull();
		expect(result.current.activeAccountId).toBe('a');
	});
});

describe('removeAccount', () => {
	const a: Account = {id: 'a', baseUrl: 'http://a', method: AuthMethod.API_KEY, apiKey: 'ka', addedAt: 1};
	const b: Account = {id: 'b', baseUrl: 'http://b', method: AuthMethod.API_KEY, apiKey: 'kb', addedAt: 2};

	test('drops the account from the list', async () => {
		seed([a, b]);
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.isValidating).toBe(false));
		act(() => result.current.removeAccount('b'));
		expect(result.current.accounts.map(x => x.id)).toEqual(['a']);
	});

	test('removing active account switches to next most recent', async () => {
		seed([a, b], {lastActiveAccountId: 'b'});
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.activeAccountId).toBe('b'));
		act(() => result.current.removeAccount('b'));
		await waitFor(() => expect(result.current.activeAccountId).toBe('a'));
	});

	test('removing the last account clears active', async () => {
		seed([a]);
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.activeAccountId).toBe('a'));
		act(() => result.current.removeAccount('a'));
		expect(result.current.activeAccountId).toBeNull();
		expect(result.current.repository).toBeNull();
	});
});

describe('switchTo', () => {
	const a: Account = {id: 'a', baseUrl: 'http://a', method: AuthMethod.API_KEY, apiKey: 'ka', addedAt: 1};
	const b: Account = {id: 'b', baseUrl: 'http://b', method: AuthMethod.API_KEY, apiKey: 'kb', addedAt: 2};

	test('changes activeAccountId and re-validates', async () => {
		seed([a, b], {lastActiveAccountId: 'a'});
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.activeAccountId).toBe('a'));
		act(() => result.current.switchTo('b'));
		await waitFor(() => expect(result.current.activeAccountId).toBe('b'));
		expect(result.current.repository).not.toBeNull();
	});

	test('on 401 keeps the new id but clears repository', async () => {
		seed([a, b], {lastActiveAccountId: 'a'});
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.activeAccountId).toBe('a'));
		mockValidate.mockResolvedValueOnce(false);
		act(() => result.current.switchTo('b'));
		await waitFor(() => expect(result.current.isValidating).toBe(false));
		expect(result.current.activeAccountId).toBe('b');
		expect(result.current.repository).toBeNull();
	});
});

describe('setAsDefault', () => {
	const a: Account = {id: 'a', baseUrl: 'http://a', method: AuthMethod.API_KEY, apiKey: 'ka', addedAt: 1};
	const b: Account = {id: 'b', baseUrl: 'http://b', method: AuthMethod.API_KEY, apiKey: 'kb', addedAt: 2};

	test('updates defaultAccountId', async () => {
		seed([a, b]);
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.isValidating).toBe(false));
		act(() => result.current.setAsDefault('b'));
		expect(result.current.defaultAccountId).toBe('b');
	});

	test('clears defaultAccountId with null', async () => {
		seed([a], {defaultAccountId: 'a'});
		const {result} = renderHook(() => useAccounts());
		await waitFor(() => expect(result.current.defaultAccountId).toBe('a'));
		act(() => result.current.setAsDefault(null));
		expect(result.current.defaultAccountId).toBeNull();
	});
});
