import {useState, useEffect, useCallback, useMemo} from 'react';
import {APIClient} from '../api/client';
import {ImmichRepository, validateAuth} from '../api/ImmichRepository';
import {AuthMethod, type ApiKeyConfig, type UserCredentialsConfig} from '../api/types';
import type {PhotoRepository} from '../domain/PhotoRepository';
import {
	readAccountsStore,
	writeAccountsStore,
	addAccountToStore,
	removeAccountFromStore,
	setDefaultInStore,
	setLastActiveInStore,
	type Account,
	type AccountsStore,
} from '../utils/accountsStore';
import {randomId} from '../utils/uuid';
import {makeAuthErrorMessage} from './_authHelpers';

export type LoginResult = {success: true} | {success: false; errorMessage: string};

export interface AddAccountCredentialsInput {
	method: AuthMethod.USER_CREDENTIALS;
	baseUrl: string;
	email: string;
	password: string;
}

export interface AddAccountApiKeyInput {
	method: AuthMethod.API_KEY;
	baseUrl: string;
	apiKey: string;
}

export type AddAccountInput = AddAccountCredentialsInput | AddAccountApiKeyInput;

const accountToConfig = (acc: Account): UserCredentialsConfig | ApiKeyConfig => {
	if (acc.method === AuthMethod.API_KEY) {
		// apiKey is guaranteed present for API_KEY accounts by construction
		return {baseUrl: acc.baseUrl, method: AuthMethod.API_KEY, apiKey: acc.apiKey as string};
	}
	return {
		baseUrl: acc.baseUrl,
		method: AuthMethod.USER_CREDENTIALS,
		// email is guaranteed present for USER_CREDENTIALS accounts by construction
		email: acc.email as string,
		accessToken: acc.accessToken,
	};
};

const resolveActiveId = (store: AccountsStore): string | null =>
	store.defaultAccountId ?? store.lastActiveAccountId ?? store.accounts[0]?.id ?? null;

export const useAccounts = () => {
	const [store, setStore] = useState<AccountsStore>(() => readAccountsStore());
	const [activeAccountId, setActiveAccountId] = useState<string | null>(() =>
		resolveActiveId(readAccountsStore()),
	);
	const [repository, setRepository] = useState<PhotoRepository | null>(null);
	const [isValidating, setIsValidating] = useState<boolean>(() => resolveActiveId(readAccountsStore()) !== null);
	const [validationError, setValidationError] = useState('');

	const persist = useCallback((next: AccountsStore) => {
		writeAccountsStore(next);
		setStore(next);
	}, []);

	const activate = useCallback(async (id: string | null) => {
		if (!id) {
			setRepository(null);
			setActiveAccountId(null);
			setIsValidating(false);
			return;
		}
		const account = readAccountsStore().accounts.find(a => a.id === id);
		if (!account) {
			setRepository(null);
			setActiveAccountId(null);
			setIsValidating(false);
			return;
		}
		setIsValidating(true);
		setValidationError('');
		try {
			const client = new APIClient(accountToConfig(account));
			const ok = await validateAuth(client);
			if (!ok) {
				setRepository(null);
				setActiveAccountId(id);
				return;
			}
			setRepository(new ImmichRepository(client));
			setActiveAccountId(id);
		} catch (error) {
			console.error('[useAccounts] validation failed', error);
			setValidationError(makeAuthErrorMessage(error, account.method));
			setRepository(null);
			setActiveAccountId(id);
		} finally {
			setIsValidating(false);
		}
	}, []);

	useEffect(() => {
		void activate(activeAccountId);
		// Mount only — subsequent activations are explicit (switchTo, removeAccount).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const addAccount = useCallback(
		async (input: AddAccountInput): Promise<LoginResult> => {
			setIsValidating(true);
			setValidationError('');
			try {
				let account: Account;
				if (input.method === AuthMethod.USER_CREDENTIALS) {
					const tempClient = new APIClient({
						baseUrl: input.baseUrl,
						method: AuthMethod.USER_CREDENTIALS,
						email: input.email,
					});
					const loginResponse = await tempClient.fetch<{accessToken: string}>('/auth/login', {
						method: 'POST',
						body: JSON.stringify({email: input.email, password: input.password}),
					});
					account = {
						id: randomId(),
						baseUrl: input.baseUrl,
						method: AuthMethod.USER_CREDENTIALS,
						email: input.email,
						accessToken: loginResponse.accessToken,
						addedAt: Date.now(),
					};
				} else {
					const probe = new APIClient({
						baseUrl: input.baseUrl,
						method: AuthMethod.API_KEY,
						apiKey: input.apiKey,
					});
					await probe.fetch('/users/me');
					account = {
						id: randomId(),
						baseUrl: input.baseUrl,
						method: AuthMethod.API_KEY,
						apiKey: input.apiKey,
						addedAt: Date.now(),
					};
				}

				const next = addAccountToStore(store, account);
				persist(next);
				const client = new APIClient(accountToConfig(account));
				setRepository(new ImmichRepository(client));
				setActiveAccountId(account.id);
				return {success: true};
			} catch (error) {
				console.error('[useAccounts] addAccount failed', error);
				return {success: false, errorMessage: makeAuthErrorMessage(error, input.method)};
			} finally {
				setIsValidating(false);
			}
		},
		[persist, store],
	);

	const removeAccount = useCallback(
		(id: string) => {
			const next = removeAccountFromStore(store, id);
			persist(next);
			if (id === activeAccountId) {
				void activate(next.lastActiveAccountId);
			}
		},
		[activate, activeAccountId, persist, store],
	);

	const switchTo = useCallback(
		(id: string) => {
			const next = setLastActiveInStore(store, id);
			persist(next);
			void activate(id);
		},
		[activate, persist, store],
	);

	const setAsDefault = useCallback(
		(id: string | null) => {
			persist(setDefaultInStore(store, id));
		},
		[persist, store],
	);

	const value = useMemo(
		() => ({
			accounts: store.accounts,
			activeAccountId,
			defaultAccountId: store.defaultAccountId,
			repository,
			isValidating,
			validationError,
			addAccount,
			removeAccount,
			switchTo,
			setAsDefault,
		}),
		[
			store,
			activeAccountId,
			repository,
			isValidating,
			validationError,
			addAccount,
			removeAccount,
			switchTo,
			setAsDefault,
		],
	);

	return value;
};
