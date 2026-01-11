import {useState, useEffect, useCallback} from 'react';
import {storage} from '../utils/storage';
import type {StoredAuthConfig} from '../utils/storage';
import {APIClient} from '../api/client';
import {ImmichAPI} from '../api/immich';
import type {AuthConfig, UserCredentialsConfig, ApiKeyConfig} from '../api/types';

export const useAuth = () => {
	const [authConfig, setAuthConfig] = useState<StoredAuthConfig | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const [apiClient, setApiClient] = useState<ImmichAPI | null>(null);

	const finalizeAuthSetup = useCallback((api: ImmichAPI, storedConfig: StoredAuthConfig) => {
		storage.setAuthConfig(storedConfig);
		setAuthConfig(storedConfig);
		setApiClient(api);
		setIsAuthenticated(true);
	}, []);

	useEffect(() => {
		const config = storage.getAuthConfig();
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
			const api = new ImmichAPI(client);

			if (config.method === 'USER_CREDENTIALS') {
				const tokenValid = await api.validateUserAuth();
				if (!tokenValid) {
					setIsAuthenticated(false);
					setApiClient(null);
					setIsValidating(false);
					return;
				}

				setApiClient(api);
				setIsAuthenticated(true);
			} else {
				try {
					await api.validateConnection();
				} catch (error) {
					console.warn('Ping failed, proceeding anyway with API key:', error);
				}

				setApiClient(api);
				setIsAuthenticated(true);
			}
		} catch (error) {
			console.error('Auth validation failed:', error);
			setIsAuthenticated(false);
			setApiClient(null);
		} finally {
			setIsValidating(false);
		}
	};

	const loginWithCredentials = useCallback(
		async (baseUrl: string, email: string, password: string): Promise<boolean> => {
			setIsValidating(true);
			try {
				const tempConfig: UserCredentialsConfig = {
					baseUrl,
					method: 'USER_CREDENTIALS',
					email,
					password,
				};
				const tempClient = new APIClient(tempConfig);
				const tempApi = new ImmichAPI(tempClient);
				const loginResponse = await tempApi.login(email, password);

				const config: UserCredentialsConfig = {
					baseUrl,
					method: 'USER_CREDENTIALS',
					email,
					password, // Will not be stored
					accessToken: loginResponse.accessToken,
				};

				const client = new APIClient(config);
				const api = new ImmichAPI(client);

				const storedConfig: StoredAuthConfig = {
					baseUrl,
					method: 'USER_CREDENTIALS',
					email,
					accessToken: loginResponse.accessToken,
				};
				finalizeAuthSetup(api, storedConfig);
				return true;
			} catch (error) {
				console.error('Credential login failed:', error);
				return false;
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
					method: 'API_KEY',
					apiKey,
				};

				const client = new APIClient(config);
				const api = new ImmichAPI(client);

				try {
					await api.validateConnection();
				} catch (error) {
					console.warn('Ping failed, proceeding anyway with API key:', error);
				}

				const storedConfig: StoredAuthConfig = {
					baseUrl,
					method: 'API_KEY',
					apiKey,
				};
				finalizeAuthSetup(api, storedConfig);
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
		storage.clearAuthConfig();
		setAuthConfig(null);
		setApiClient(null);
		setIsAuthenticated(false);
	}, []);

	return {
		authConfig,
		isAuthenticated,
		isValidating,
		apiClient,
		loginWithCredentials,
		loginWithApiKey,
		logout,
	};
};

const storedConfigToAuthConfig = (stored: StoredAuthConfig): AuthConfig => {
	if (stored.method === 'USER_CREDENTIALS') {
		return {
			baseUrl: stored.baseUrl,
			method: 'USER_CREDENTIALS',
			email: stored.email!,
			password: '', // Never stored
			accessToken: stored.accessToken,
		};
	} else {
		return {
			baseUrl: stored.baseUrl,
			method: 'API_KEY',
			apiKey: stored.apiKey!,
		};
	}
};
