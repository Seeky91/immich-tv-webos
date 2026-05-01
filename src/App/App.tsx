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

import css from './App.module.less';

const AppBase: React.FC = () => {
	const {isAuthenticated, isValidating, repository, loginWithApiKey, loginWithCredentials, logout} = useAuth();

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

	if (isValidating) {
		return (
			<div className={css.app} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
				<p>Loading…</p>
			</div>
		);
	}

	if (!isAuthenticated || !repository) {
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
