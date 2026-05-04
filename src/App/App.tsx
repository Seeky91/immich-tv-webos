import Panels from '@enact/sandstone/Panels';
import ThemeDecorator from '@enact/sandstone/ThemeDecorator';
import {QueryCache, QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React, {useMemo} from 'react';

import {useAuth} from '../hooks/useAuth';
import {RepositoryProvider} from '../domain/RepositoryContext';
import {isAPIError} from '../utils/typeGuards';
import AppLayout from '../views/AppLayout';
import LoginPanel from '../views/LoginPanel';

import './attachErrorHandler';
import '../styles/tokens.less';

import css from './App.module.less';

const AppBase: React.FC = () => {
	const {authConfig, isAuthenticated, isValidating, repository, loginWithApiKey, loginWithCredentials, logout} = useAuth();

	const queryClient = useMemo(
		() =>
			new QueryClient({
				queryCache: new QueryCache({
					onError: (error) => {
						if (isAPIError(error) && error.status === 401) logout();
					},
				}),
			}),
		[logout]
	);

	if (!isAuthenticated || !repository) {
		// Only show <Loading> during initial validation of *stored* credentials.
		// During user-initiated login submission, keep LoginPanel mounted so its inputs and
		// any error message survive the round-trip (the panel shows its own "Connecting…" state).
		if (isValidating && authConfig) {
			return (
				<div className={css.app} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
					<p>Loading…</p>
				</div>
			);
		}
		return (
			<div className={css.app}>
				<Panels>
					<LoginPanel isValidating={isValidating} onLoginWithApiKey={loginWithApiKey} onLoginWithCredentials={loginWithCredentials} />
				</Panels>
			</div>
		);
	}

	return (
		<QueryClientProvider client={queryClient}>
			<RepositoryProvider repository={repository}>
				<div className={css.app}>
					<AppLayout onSignOut={logout} />
				</div>
			</RepositoryProvider>
		</QueryClientProvider>
	);
};

export default ThemeDecorator(AppBase);
