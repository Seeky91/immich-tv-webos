import {useState, useEffect, useCallback} from 'react';
import StorageService from '../utils/storage';
import type {StoredAuthConfig} from '../utils/storage';
import {APIClient, APIError} from '../api/client';
import {ImmichRepository, validateAuth} from '../api/ImmichRepository';
import {type AuthConfig, type UserCredentialsConfig, type ApiKeyConfig, AuthMethod} from '../api/types';
import type {PhotoRepository} from '../domain/PhotoRepository';

export interface LoginResult {
	success: boolean;
	errorMessage?: string;
}

export const useAuth = () => {
	const [authConfig, setAuthConfig] = useState<StoredAuthConfig | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const [repository, setRepository] = useState<PhotoRepository | null>(null);

	const finalizeAuthSetup = useCallback((repo: PhotoRepository, storedConfig: StoredAuthConfig) => {
		StorageService.setAuthConfig(storedConfig);
		setAuthConfig(storedConfig);
		setRepository(repo);
		setIsAuthenticated(true);
	}, []);

	useEffect(() => {
		const config = StorageService.getAuthConfig();
		if (config) {
			setAuthConfig(config);
			validateAndSetup(config);
		} else {
			setIsValidating(false);
		}
	}, []);

	const validateAndSetup = async (config: StoredAuthConfig) => {
		setIsValidating(true);
		try {
			const apiConfig = storedConfigToAuthConfig(config);
			const client = new APIClient(apiConfig);

			const authValid = await validateAuth(client);
			if (!authValid) {
				setIsAuthenticated(false);
				setRepository(null);
				return;
			}

			setRepository(new ImmichRepository(client));
			setIsAuthenticated(true);
		} catch (error) {
			console.error('Auth validation failed:', error);
			setIsAuthenticated(false);
			setRepository(null);
		} finally {
			setIsValidating(false);
		}
	};

	const loginWithCredentials = useCallback(
		async (baseUrl: string, email: string, password: string): Promise<LoginResult> => {
			setIsValidating(true);
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
				const errorMessage =
					error instanceof APIError && error.status === 401
						? 'Invalid email or password'
						: error instanceof Error
						? error.message
						: 'Login failed. Check your credentials.';
				return {success: false, errorMessage};
			} finally {
				setIsValidating(false);
			}
		},
		[finalizeAuthSetup]
	);

	const loginWithApiKey = useCallback(
		async (baseUrl: string, apiKey: string): Promise<boolean> => {
			setIsValidating(true);
			try {
				const config: ApiKeyConfig = {
					baseUrl,
					method: AuthMethod.API_KEY,
					apiKey,
				};

				const client = new APIClient(config);

				const authValid = await validateAuth(client);
				if (!authValid) return false;

				const storedConfig: StoredAuthConfig = {
					baseUrl,
					method: AuthMethod.API_KEY,
					apiKey,
				};
				finalizeAuthSetup(new ImmichRepository(client), storedConfig);
				return true;
			} catch (error) {
				console.error('API key login failed:', error);
				return false;
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
	}, []);

	return {
		authConfig,
		isAuthenticated,
		isValidating,
		repository,
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
