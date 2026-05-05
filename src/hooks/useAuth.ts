import {useState, useEffect, useCallback} from 'react';
import StorageService from '../utils/storage';
import type {StoredAuthConfig} from '../utils/storage';
import {APIClient, APIError} from '../api/client';
import {ImmichRepository, validateAuth} from '../api/ImmichRepository';
import {type AuthConfig, type UserCredentialsConfig, type ApiKeyConfig, AuthMethod} from '../api/types';
import type {PhotoRepository} from '../domain/PhotoRepository';

export type LoginResult = {success: true} | {success: false; errorMessage: string};

const NETWORK_ERROR_MESSAGE =
	"Couldn't reach the server. Verify the URL and that your Immich server allows requests from this app (CORS).";

function makeAuthErrorMessage(error: unknown, method: AuthMethod): string {
	if (error instanceof APIError) {
		if (error.status === 401) {
			return method === AuthMethod.API_KEY ? 'Invalid API key' : 'Invalid email or password';
		}
		if (error.status) return `Server returned ${error.status}`;
	}
	return NETWORK_ERROR_MESSAGE;
}

export const useAuth = () => {
	// Initialize from storage synchronously so the first render reflects the persisted state.
	// Without this, every mount briefly showed an empty <Loading> screen even when no creds existed.
	const [authConfig, setAuthConfig] = useState<StoredAuthConfig | null>(() => StorageService.getAuthConfig());
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isValidating, setIsValidating] = useState<boolean>(() => StorageService.getAuthConfig() !== null);
	const [repository, setRepository] = useState<PhotoRepository | null>(null);
	const [validationError, setValidationError] = useState('');

	const finalizeAuthSetup = useCallback((repo: PhotoRepository, storedConfig: StoredAuthConfig) => {
		StorageService.setAuthConfig(storedConfig);
		setAuthConfig(storedConfig);
		setRepository(repo);
		setIsAuthenticated(true);
	}, []);

	useEffect(() => {
		const stored = StorageService.getAuthConfig();
		if (stored) void validateAndSetup(stored);
	}, []);

	const validateAndSetup = async (config: StoredAuthConfig) => {
		setIsValidating(true);
		setValidationError('');
		try {
			const apiConfig = storedConfigToAuthConfig(config);
			const client = new APIClient(apiConfig);

			const authValid = await validateAuth(client);
			if (!authValid) {
				// 401: token expired or revoked — silent fallback to LoginPanel (expected UX).
				setIsAuthenticated(false);
				setRepository(null);
				return;
			}

			setRepository(new ImmichRepository(client));
			setIsAuthenticated(true);
		} catch (error) {
			// Non-401 (5xx, network/CORS) — surface so the user knows why we fell back.
			console.error('Auth validation failed:', error);
			setValidationError(makeAuthErrorMessage(error, config.method));
			setIsAuthenticated(false);
			setRepository(null);
		} finally {
			setIsValidating(false);
		}
	};

	const loginWithCredentials = useCallback(
		async (baseUrl: string, email: string, password: string): Promise<LoginResult> => {
			setIsValidating(true);
			setValidationError('');
			try {
				const tempConfig: UserCredentialsConfig = {
					baseUrl,
					method: AuthMethod.USER_CREDENTIALS,
					email,
					password,
				};
				const tempClient = new APIClient(tempConfig);
				const loginResponse = await tempClient.fetch<{accessToken: string}>('/auth/login', {
					method: 'POST',
					body: JSON.stringify({email, password}),
				});

				const sessionConfig: UserCredentialsConfig = {
					baseUrl,
					method: AuthMethod.USER_CREDENTIALS,
					email,
					password: '' /* Will not be stored */,
					accessToken: loginResponse.accessToken,
				};

				const client = new APIClient(sessionConfig);
				const repo = new ImmichRepository(client);

				const storedConfig: StoredAuthConfig = {
					baseUrl,
					method: AuthMethod.USER_CREDENTIALS,
					email,
					accessToken: loginResponse.accessToken,
				};
				finalizeAuthSetup(repo, storedConfig);
				return {success: true};
			} catch (error) {
				console.error('Credential login failed:', error);
				return {success: false, errorMessage: makeAuthErrorMessage(error, AuthMethod.USER_CREDENTIALS)};
			} finally {
				setIsValidating(false);
			}
		},
		[finalizeAuthSetup]
	);

	const loginWithApiKey = useCallback(
		async (baseUrl: string, apiKey: string): Promise<LoginResult> => {
			setIsValidating(true);
			setValidationError('');
			try {
				const config: ApiKeyConfig = {
					baseUrl,
					method: AuthMethod.API_KEY,
					apiKey,
				};

				const client = new APIClient(config);
				// Throws on network/CORS failure or non-2xx status — we propagate the error so the
				// caller can show a meaningful message instead of a generic "failed".
				await client.fetch('/users/me');

				const storedConfig: StoredAuthConfig = {
					baseUrl,
					method: AuthMethod.API_KEY,
					apiKey,
				};
				finalizeAuthSetup(new ImmichRepository(client), storedConfig);
				return {success: true};
			} catch (error) {
				console.error('API key login failed:', error);
				return {success: false, errorMessage: makeAuthErrorMessage(error, AuthMethod.API_KEY)};
			} finally {
				setIsValidating(false);
			}
		},
		[finalizeAuthSetup]
	);

	const logout = useCallback(() => {
		StorageService.clearAuthConfig();
		setAuthConfig(null);
		setRepository(null);
		setIsAuthenticated(false);
		setValidationError('');
	}, []);

	return {
		authConfig,
		isAuthenticated,
		isValidating,
		repository,
		validationError,
		loginWithCredentials,
		loginWithApiKey,
		logout,
	};
};

const storedConfigToAuthConfig = (stored: StoredAuthConfig): AuthConfig => {
	return stored.method === AuthMethod.USER_CREDENTIALS
		? {
				baseUrl: stored.baseUrl,
				method: AuthMethod.USER_CREDENTIALS,
				email: stored.email!,
				password: '' /* Never stored */,
				accessToken: stored.accessToken,
		  }
		: {
				baseUrl: stored.baseUrl,
				method: AuthMethod.API_KEY,
				apiKey: stored.apiKey!,
		  };
};
