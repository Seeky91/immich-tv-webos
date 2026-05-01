import Panels from '@enact/sandstone/Panels';
import ThemeDecorator from '@enact/sandstone/ThemeDecorator';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';

import {useAuth} from '../hooks/useAuth';
import {RepositoryProvider} from '../domain/RepositoryContext';
import AppLayout from '../views/AppLayout';
import LoginPanel from '../views/LoginPanel';

import './attachErrorHandler';

import css from './App.module.less';

const queryClient = new QueryClient();

const AppBase: React.FC = () => {
	const {isAuthenticated, isValidating, repository, loginWithApiKey, loginWithCredentials, logout} = useAuth();

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
