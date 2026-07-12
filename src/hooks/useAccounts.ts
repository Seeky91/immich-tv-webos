import {useState, useEffect, useCallback, useMemo} from 'react';
import {APIClient} from '../api/client';
import {ImmichRepository, validateAuth} from '../api/ImmichRepository';
import {AuthMethod, type ApiKeyConfig, type UserCredentialsConfig, type AuthSubmitResult, type AuthFormPayload} from '../api/types';
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
import type {PairedAccountResult} from '../pairing/types';

const accountToConfig = (acc: Account): UserCredentialsConfig | ApiKeyConfig => {
	if (acc.method === AuthMethod.API_KEY) {
		if (!acc.apiKey) throw new Error(`[useAccounts] API_KEY account ${acc.id} has no apiKey`);
		return {baseUrl: acc.baseUrl, method: AuthMethod.API_KEY, apiKey: acc.apiKey};
	}
	if (!acc.email) throw new Error(`[useAccounts] USER_CREDENTIALS account ${acc.id} has no email`);
	return {
		baseUrl: acc.baseUrl,
		method: AuthMethod.USER_CREDENTIALS,
		email: acc.email,
		accessToken: acc.accessToken,
	};
};

const resolveActiveId = (store: AccountsStore): string | null =>
	store.defaultAccountId ?? store.lastActiveAccountId ?? store.accounts[0]?.id ?? null;

export const useAccounts = () => {
	let _initial: AccountsStore | undefined;
	const getInitial = () => (_initial ??= readAccountsStore());

	const [store, setStore] = useState<AccountsStore>(getInitial);
	const [activeAccountId, setActiveAccountId] = useState<string | null>(() => resolveActiveId(getInitial()));
	const [repository, setRepository] = useState<PhotoRepository | null>(null);
	const [isValidating, setIsValidating] = useState<boolean>(() => resolveActiveId(getInitial()) !== null);
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
		async (input: AuthFormPayload): Promise<AuthSubmitResult> => {
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

	// Phone-pairing login: the token was already minted by the service, so this
	// only validates it and reuses the regular persist → repository tail.
	const addPairedAccount = useCallback(
		async (input: PairedAccountResult): Promise<AuthSubmitResult> => {
			setIsValidating(true);
			setValidationError('');
			try {
				const client = new APIClient({
					baseUrl: input.baseUrl,
					method: AuthMethod.USER_CREDENTIALS,
					email: input.email,
					accessToken: input.accessToken,
				});
				const ok = await validateAuth(client);
				if (!ok) {
					return {success: false, errorMessage: 'The server rejected the phone sign-in session. Try again.'};
				}
				const account: Account = {
					id: randomId(),
					baseUrl: input.baseUrl,
					method: AuthMethod.USER_CREDENTIALS,
					email: input.email,
					accessToken: input.accessToken,
					addedAt: Date.now(),
				};
				const next = addAccountToStore(store, account);
				persist(next);
				setRepository(new ImmichRepository(client));
				setActiveAccountId(account.id);
				return {success: true};
			} catch (error) {
				console.error('[useAccounts] addPairedAccount failed', error);
				return {success: false, errorMessage: makeAuthErrorMessage(error, AuthMethod.USER_CREDENTIALS)};
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
			addPairedAccount,
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
			addPairedAccount,
			removeAccount,
			switchTo,
			setAsDefault,
		],
	);

	return value;
};
