import Panels from '@enact/sandstone/Panels';
import ThemeDecorator from '@enact/sandstone/ThemeDecorator';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';

import {useAuth} from '../hooks/useAuth';
import LoginPanel from '../views/LoginPanel';
import MainPanel from '../views/MainPanel';

import './attachErrorHandler';

import css from './App.module.less';

const queryClient = new QueryClient();

const AppBase: React.FC = () => {
	const {isAuthenticated, isValidating, apiClient, loginWithApiKey, loginWithCredentials} = useAuth();

	if (isValidating) {
		return (
			<div className={css.app} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
				<p>Loading…</p>
			</div>
		);
	}

	if (!isAuthenticated || !apiClient) {
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
			<div className={css.app}>
				<Panels>
					<MainPanel api={apiClient} />
				</Panels>
			</div>
		</QueryClientProvider>
	);
};

export default ThemeDecorator(AppBase);
