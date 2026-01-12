import type {AuthConfig} from './types';

export class APIError extends Error {
	public status?: number;
	public response?: unknown;

	constructor(message: string, status?: number, response?: unknown) {
		super(message);
		this.name = 'APIError';
		this.status = status;
		this.response = response;
	}
}

export class APIClient {
	private baseUrl: string;
	private authConfig: AuthConfig;

	constructor(config: AuthConfig) {
		let normalized = config.baseUrl.trim();
		normalized = normalized.replace(/\/+$/, '');
		if (!normalized.endsWith('/api')) {
			normalized = `${normalized}/api`;
		}

		this.baseUrl = normalized;
		this.authConfig = config;
	}

	private getHeaders(): HeadersInit {
		return {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(this.authConfig.method === 'USER_CREDENTIALS' &&
				this.authConfig.accessToken && {
					'x-immich-user-token': this.authConfig.accessToken,
				}),
			...(this.authConfig.method === 'API_KEY' && {
				'x-api-key': this.authConfig.apiKey,
			}),
		} as HeadersInit;
	}

	private getMediaAuthParam(): {name: string; value: string} {
		return this.authConfig.method === 'USER_CREDENTIALS' ? {name: 'sessionKey', value: this.authConfig.accessToken || ''} : {name: 'apiKey', value: this.authConfig.apiKey};
	}

	public async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const method = options.method || 'GET';

		try {
			const response = await fetch(url, {
				...options,
				headers: {...this.getHeaders(), ...options.headers},
			});
			if (!response.ok) {
				const errorBody = await response.text();
				console.error(`[API] ${method} ${url} failed with ${response.status}: ${response.statusText}`);
				throw new APIError(`API request failed: ${response.statusText}`, response.status, errorBody);
			}

			const text = await response.text();
			return text ? JSON.parse(text) : ({} as T);
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}
			console.error(`[API] ${method} ${url} network error:`, error);
			throw new APIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public async fetchBlob(endpoint: string): Promise<Blob> {
		const url = `${this.baseUrl}${endpoint}`;
		const {name, value} = this.getMediaAuthParam();
		const urlWithAuth = url.includes('?') ? `${url}&${name}=${value}` : `${url}?${name}=${value}`;

		const response = await fetch(urlWithAuth);
		if (!response.ok) {
			throw new APIError(`Failed to fetch blob: ${response.statusText}`, response.status);
		}

		return response.blob();
	}

	public getThumbnailUrl(assetId: string, size: 'preview' | 'thumbnail' = 'thumbnail'): string {
		const {name, value} = this.getMediaAuthParam();
		return `${this.baseUrl}/assets/${assetId}/thumbnail?size=${size}&${name}=${value}`;
	}

	public getAssetUrl(assetId: string): string {
		const {name, value} = this.getMediaAuthParam();
		return `${this.baseUrl}/assets/${assetId}/original?${name}=${value}`;
	}
}
