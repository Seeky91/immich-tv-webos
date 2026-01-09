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

	// Load auth config from storage on mount
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
			// Changement de nom ici : authConfig -> apiConfig
			const apiConfig = storedConfigToAuthConfig(config);
			const client = new APIClient(apiConfig);
			const api = new ImmichAPI(client);

			// For user credentials, validate token instead of ping
			if (config.method === 'USER_CREDENTIALS') {
				const tokenValid = await api.validateUserAuth();
				if (!tokenValid) {
					// Token expired or invalid, force logout
					setIsAuthenticated(false);
					setApiClient(null);
					setIsValidating(false);
					return;
				}

				// Token is valid, proceed to gallery
				setApiClient(api);
				setIsAuthenticated(true);
			} else {
				// For API key, try ping but proceed even if it fails
				try {
					await api.validateConnection();
				} catch (error) {
					console.warn('Ping failed, proceeding anyway with API key:', error);
				}

				// Proceed to gallery with API key
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

	const loginWithCredentials = useCallback(async (baseUrl: string, email: string, password: string): Promise<boolean> => {
		setIsValidating(true);
		try {
			// Create temporary client to perform login (no token yet)
			const tempConfig: UserCredentialsConfig = {
				baseUrl,
				method: 'USER_CREDENTIALS',
				email,
				password,
			};
			const tempClient = new APIClient(tempConfig);
			const tempApi = new ImmichAPI(tempClient);

			// Perform login to get access token
			const loginResponse = await tempApi.login(email, password);

			// Create config with access token
			const config: UserCredentialsConfig = {
				baseUrl,
				method: 'USER_CREDENTIALS',
				email,
				password, // Will not be stored
				accessToken: loginResponse.accessToken,
			};

			// Create API client with token
			const client = new APIClient(config);
			const api = new ImmichAPI(client);

			// Skip ping check - if login succeeded and we have a token, proceed
			// Store config WITHOUT password
			const storedConfig: StoredAuthConfig = {
				baseUrl,
				method: 'USER_CREDENTIALS',
				email,
				accessToken: loginResponse.accessToken,
			};
			storage.setAuthConfig(storedConfig);
			setAuthConfig(storedConfig);
			setApiClient(api);
			setIsAuthenticated(true);
			return true;
		} catch (error) {
			console.error('Credential login failed:', error);
			return false;
		} finally {
			setIsValidating(false);
		}
	}, []);

	const loginWithApiKey = useCallback(async (baseUrl: string, apiKey: string): Promise<boolean> => {
		setIsValidating(true);
		try {
			const config: ApiKeyConfig = {
				baseUrl,
				method: 'API_KEY',
				apiKey,
			};

			const client = new APIClient(config);
			const api = new ImmichAPI(client);

			// Try ping but don't block on failure
			try {
				await api.validateConnection();
			} catch (error) {
				console.warn('Ping failed, proceeding anyway with API key:', error);
			}

			// Proceed to gallery with API key
			const storedConfig: StoredAuthConfig = {
				baseUrl,
				method: 'API_KEY',
				apiKey,
			};
			storage.setAuthConfig(storedConfig);
			setAuthConfig(storedConfig);
			setApiClient(api);
			setIsAuthenticated(true);
			return true;
		} catch (error) {
			console.error('API key login failed:', error);
			return false;
		} finally {
			setIsValidating(false);
		}
	}, []);

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

// Helper function to convert stored config to auth config
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
