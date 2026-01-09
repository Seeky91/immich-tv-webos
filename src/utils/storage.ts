import type {AuthMethod} from '../api/types';

const STORAGE_KEYS = {
	AUTH_CONFIG: 'immich_auth_config',
	LAST_VIEWED_INDEX: 'immich_last_viewed_index',
} as const;

export interface StoredAuthConfig {
	baseUrl: string;
	method: AuthMethod;
	apiKey?: string;
	email?: string;
	accessToken?: string;
}

export const storage = {
	// Auth Config
	getAuthConfig(): StoredAuthConfig | null {
		const stored = localStorage.getItem(STORAGE_KEYS.AUTH_CONFIG);
		if (!stored) return null;

		try {
			const config = JSON.parse(stored);

			// Validate required fields
			if (!config.baseUrl || !config.method) {
				console.error('[Storage] Invalid auth config, clearing');
				this.clearAuthConfig();
				return null;
			}

			// Migration: Add method field if missing (legacy API key configs)
			if (!config.method && config.apiKey) {
				config.method = 'API_KEY';
			}

			return config;
		} catch (error) {
			console.error('[Storage] Failed to parse auth config:', error);
			this.clearAuthConfig();
			return null;
		}
	},

	setAuthConfig(config: StoredAuthConfig): void {
		localStorage.setItem(STORAGE_KEYS.AUTH_CONFIG, JSON.stringify(config));
	},

	clearAuthConfig(): void {
		localStorage.removeItem(STORAGE_KEYS.AUTH_CONFIG);
	},

	// Last Viewed Index (for resuming playback)
	getLastViewedIndex(): number {
		const stored = localStorage.getItem(STORAGE_KEYS.LAST_VIEWED_INDEX);
		return stored ? parseInt(stored, 10) : 0;
	},

	setLastViewedIndex(index: number): void {
		localStorage.setItem(STORAGE_KEYS.LAST_VIEWED_INDEX, index.toString());
	},
};
