import React, {useCallback, useState} from 'react';
import Button from '@enact/sandstone/Button';
import Input from '@enact/sandstone/Input';
import TabLayout, {Tab} from '@enact/sandstone/TabLayout';
import {ErrorMessage} from '../ErrorMessage';
import {UrlInput} from '../UrlInput/UrlInput';
import {AuthMethod} from '../../api/types';
import css from './AuthForm.module.less';

export type AuthSubmitResult = {success: true} | {success: false; errorMessage: string};

export interface AuthFormCredentialsPayload {
	method: AuthMethod.USER_CREDENTIALS;
	baseUrl: string;
	email: string;
	password: string;
}

export interface AuthFormApiKeyPayload {
	method: AuthMethod.API_KEY;
	baseUrl: string;
	apiKey: string;
}

export type AuthFormPayload = AuthFormCredentialsPayload | AuthFormApiKeyPayload;

interface AuthFormProps {
	initialUrl: string;
	onSubmit: (payload: AuthFormPayload) => Promise<AuthSubmitResult>;
	onBack?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({initialUrl, onSubmit, onBack}) => {
	const [url, setUrl] = useState(initialUrl);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	// Sandstone Input emits a custom {value} payload (not the standard React event).
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleEmailChange = useCallback((e: any) => setEmail(e.value as string), []);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handlePasswordChange = useCallback((e: any) => setPassword(e.value as string), []);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleApiKeyChange = useCallback((e: any) => setApiKey(e.value as string), []);

	const submit = useCallback(
		async (payload: AuthFormPayload) => {
			setError('');
			setSubmitting(true);
			try {
				const result = await onSubmit(payload);
				if (!result.success) setError(result.errorMessage);
			} finally {
				setSubmitting(false);
			}
		},
		[onSubmit],
	);

	const submitCreds = useCallback(() => {
		if (!url || !email || !password) {
			setError('Please fill in all fields');
			return;
		}
		void submit({method: AuthMethod.USER_CREDENTIALS, baseUrl: url, email, password});
	}, [url, email, password, submit]);

	const submitApi = useCallback(() => {
		if (!url || !apiKey) {
			setError('Please enter both URL and API key');
			return;
		}
		void submit({method: AuthMethod.API_KEY, baseUrl: url, apiKey});
	}, [url, apiKey, submit]);

	return (
		<div>
			{onBack ? (
				<Button className={css.backBtn} size="small" icon="arrowsmallleft" onClick={onBack}>
					Back
				</Button>
			) : null}

			<div className={css.form}>
				<TabLayout orientation="vertical">
					<Tab title="Email" tabKey="creds">
						<div className={css.field}>
							<label className={css.label}>Server URL</label>
							<UrlInput
								value={url}
								onChange={setUrl}
								disabled={submitting}
								placeholder="http://192.168.1.42:2283 or https://immich.mydomain.com"
								autoFocus
							/>
						</div>
						<div className={css.field}>
							<Input
								size="large"
								value={email}
								onChange={handleEmailChange}
								placeholder="Email"
								disabled={submitting}
							/>
						</div>
						<div className={css.field}>
							<label className={css.label}>Password</label>
							<Input
								size="large"
								type="password"
								value={password}
								onChange={handlePasswordChange}
								placeholder="Password"
								disabled={submitting}
							/>
						</div>
						<div className={css.actions}>
							<Button onClick={submitCreds} disabled={submitting} backgroundOpacity="opaque">
								{submitting ? 'Connecting…' : 'Connect'}
							</Button>
						</div>
					</Tab>

					<Tab title="API Key" tabKey="apikey">
						<div className={css.field}>
							<label className={css.label}>Server URL</label>
							<UrlInput
								value={url}
								onChange={setUrl}
								disabled={submitting}
								placeholder="http://192.168.1.42:2283"
							/>
						</div>
						<div className={css.field}>
							<label className={css.label}>API Key</label>
							<Input
								size="large"
								value={apiKey}
								onChange={handleApiKeyChange}
								placeholder="API Key"
								disabled={submitting}
							/>
						</div>
						<div className={css.actions}>
							<Button onClick={submitApi} disabled={submitting} backgroundOpacity="opaque">
								{submitting ? 'Connecting…' : 'Connect'}
							</Button>
						</div>
					</Tab>
				</TabLayout>

				<ErrorMessage message={error} className={css.error} />
			</div>
		</div>
	);
};
