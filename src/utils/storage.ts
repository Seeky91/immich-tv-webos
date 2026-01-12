import {AuthMethod} from '../api/types';

export interface StoredAuthConfig {
	baseUrl: string;
	method: AuthMethod;
	apiKey?: string;
	email?: string;
	accessToken?: string;
}

abstract class StorageService {
	private static readonly KEYS = {AUTH_CONFIG: 'immich_auth_config', LAST_VIEWED_INDEX: 'immich_last_viewed_index'} as const;

	public static getAuthConfig(): StoredAuthConfig | null {
		const stored = localStorage.getItem(this.KEYS.AUTH_CONFIG);
		if (!stored) return null;

		try {
			const config = JSON.parse(stored) as Partial<StoredAuthConfig>;

			if (!config.method && config.apiKey) {
				config.method = AuthMethod.API_KEY;
			}

			if (!config.baseUrl || !config.method) {
				console.error('[Storage] Invalid auth config, clearing');
				this.clearAuthConfig();
				return null;
			}

			return config as StoredAuthConfig;
		} catch (error) {
			console.error('[Storage] Failed to parse auth config:', error);
			this.clearAuthConfig();
			return null;
		}
	}

	public static setAuthConfig(config: StoredAuthConfig): void {
		localStorage.setItem(this.KEYS.AUTH_CONFIG, JSON.stringify(config));
	}

	public static clearAuthConfig(): void {
		localStorage.removeItem(this.KEYS.AUTH_CONFIG);
	}

	public static getLastViewedIndex(): number {
		const stored = localStorage.getItem(this.KEYS.LAST_VIEWED_INDEX);
		return stored ? parseInt(stored, 10) : 0;
	}

	public static setLastViewedIndex(index: number): void {
		localStorage.setItem(this.KEYS.LAST_VIEWED_INDEX, index.toString());
	}
}

export default StorageService;
