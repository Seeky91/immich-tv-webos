import {APIError} from '../api/client';
import {type AuthConfig, AuthMethod} from '../api/types';
import type {StoredAuthConfig} from '../utils/storage';

const NETWORK_ERROR_MESSAGE =
	"Couldn't reach the server. Verify the URL and that your Immich server allows requests from this app (CORS).";

export function makeAuthErrorMessage(error: unknown, method: AuthMethod): string {
	if (error instanceof APIError) {
		if (error.status === 401) {
			return method === AuthMethod.API_KEY ? 'Invalid API key' : 'Invalid email or password';
		}
		if (error.status) return `Server returned ${error.status}`;
	}
	return NETWORK_ERROR_MESSAGE;
}

export const storedConfigToAuthConfig = (stored: StoredAuthConfig): AuthConfig => {
	return stored.method === AuthMethod.USER_CREDENTIALS
		? {
				baseUrl: stored.baseUrl,
				method: AuthMethod.USER_CREDENTIALS,
				email: stored.email!,
				accessToken: stored.accessToken,
		  }
		: {
				baseUrl: stored.baseUrl,
				method: AuthMethod.API_KEY,
				apiKey: stored.apiKey!,
		  };
};
