import {AuthMethod} from '../api/types';
import {randomId} from './uuid';

export interface Account {
	id: string;
	baseUrl: string;
	method: AuthMethod;
	email?: string;
	accessToken?: string;
	apiKey?: string;
	addedAt: number;
}

export interface AccountsStore {
	version: 2;
	accounts: Account[];
	defaultAccountId: string | null;
	lastActiveAccountId: string | null;
}

const ACCOUNTS_KEY = 'immich_accounts';
const LEGACY_KEY = 'immich_auth_config';

const emptyStore = (): AccountsStore => ({
	version: 2,
	accounts: [],
	defaultAccountId: null,
	lastActiveAccountId: null,
});

interface LegacyConfig {
	baseUrl: string;
	method?: AuthMethod;
	apiKey?: string;
	email?: string;
	accessToken?: string;
}

const migrateLegacy = (legacy: LegacyConfig): AccountsStore | null => {
	if (!legacy.baseUrl) return null;
	let method = legacy.method;
	if (!method && legacy.apiKey) method = AuthMethod.API_KEY;
	if (!method) return null;
	const id = randomId();
	const account: Account = {
		id,
		baseUrl: legacy.baseUrl,
		method,
		email: legacy.email,
		accessToken: legacy.accessToken,
		apiKey: legacy.apiKey,
		addedAt: Date.now(),
	};
	return {version: 2, accounts: [account], defaultAccountId: id, lastActiveAccountId: id};
};

export function readAccountsStore(): AccountsStore {
	const raw = localStorage.getItem(ACCOUNTS_KEY);
	if (raw) {
		try {
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			if (parsed && parsed['version'] === 2 && Array.isArray(parsed['accounts'])) {
				return parsed as unknown as AccountsStore;
			}
		} catch (e) {
			console.error('[accountsStore] failed to parse store, falling back', e);
		}
	}

	const legacyRaw = localStorage.getItem(LEGACY_KEY);
	if (legacyRaw) {
		try {
			const legacy = JSON.parse(legacyRaw) as LegacyConfig;
			const migrated = migrateLegacy(legacy);
			if (migrated) {
				writeAccountsStore(migrated);
				localStorage.removeItem(LEGACY_KEY);
				return migrated;
			}
		} catch (e) {
			console.error('[accountsStore] failed to migrate legacy config', e);
		}
		localStorage.removeItem(LEGACY_KEY);
	}

	return emptyStore();
}

export function writeAccountsStore(store: AccountsStore): void {
	localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(store));
}

export function addAccountToStore(store: AccountsStore, account: Account): AccountsStore {
	return {
		...store,
		accounts: [...store.accounts, account],
		lastActiveAccountId: account.id,
	};
}

export function removeAccountFromStore(store: AccountsStore, id: string): AccountsStore {
	const accounts = store.accounts.filter(a => a.id !== id);
	const sortedRemaining = [...accounts].sort((a, b) => b.addedAt - a.addedAt);
	return {
		...store,
		accounts,
		defaultAccountId: store.defaultAccountId === id ? null : store.defaultAccountId,
		lastActiveAccountId:
			store.lastActiveAccountId === id ? (sortedRemaining[0]?.id ?? null) : store.lastActiveAccountId,
	};
}

export function setDefaultInStore(store: AccountsStore, id: string | null): AccountsStore {
	return {...store, defaultAccountId: id};
}

export function setLastActiveInStore(store: AccountsStore, id: string): AccountsStore {
	return {...store, lastActiveAccountId: id};
}
