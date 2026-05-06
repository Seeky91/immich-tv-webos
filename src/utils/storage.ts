import {AuthMethod} from '../api/types';

export interface StoredAuthConfig {
	baseUrl: string;
	method: AuthMethod;
	apiKey?: string;
	email?: string;
	accessToken?: string;
}

const AUTH_CONFIG_KEY = 'immich_auth_config';

export function getAuthConfig(): StoredAuthConfig | null {
	const stored = localStorage.getItem(AUTH_CONFIG_KEY);
	if (!stored) return null;

	try {
		const config = JSON.parse(stored) as Partial<StoredAuthConfig>;

		if (!config.method && config.apiKey) {
			config.method = AuthMethod.API_KEY;
		}

		if (!config.baseUrl || !config.method) {
			console.error('[Storage] Invalid auth config, clearing');
			clearAuthConfig();
			return null;
		}

		return config as StoredAuthConfig;
	} catch (error) {
		console.error('[Storage] Failed to parse auth config:', error);
		clearAuthConfig();
		return null;
	}
}

export function setAuthConfig(config: StoredAuthConfig): void {
	localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(config));
}

export function clearAuthConfig(): void {
	localStorage.removeItem(AUTH_CONFIG_KEY);
}
