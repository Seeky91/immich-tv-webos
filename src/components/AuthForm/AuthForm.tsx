import React, {useCallback, useState} from 'react';
import Button from '@enact/sandstone/Button';
import TabLayout, {Tab} from '@enact/sandstone/TabLayout';
import {ErrorMessage} from '../ErrorMessage';
import {FieldRow} from '../FieldRow/FieldRow';
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
		<div className={css.root}>
			{onBack ? (
				<Button className={css.backBtn} size="small" icon="arrowsmallleft" onClick={onBack}>
					Back
				</Button>
			) : null}

			<div className={css.form}>
				<TabLayout className={css.layout} orientation="vertical">
					<Tab title="Email" tabKey="creds">
						<div className={css.tabContent}>
							<div className={css.field}>
								<label className={css.label}>Server URL</label>
								<UrlInput
									value={url}
									onChange={setUrl}
									disabled={submitting}
									placeholder="http(s)://…"
									autoFocus
								/>
							</div>
							<div className={css.field}>
								<label className={css.label}>Email</label>
								<FieldRow
									value={email}
									onChange={setEmail}
									placeholder="Email"
									disabled={submitting}
									clearLabel="Clear Email"
								/>
							</div>
							<div className={css.field}>
								<label className={css.label}>Password</label>
								<FieldRow
									value={password}
									onChange={setPassword}
									type="password"
									placeholder="Password"
									disabled={submitting}
									clearLabel="Clear Password"
								/>
							</div>
							<div className={css.actions}>
								<Button onClick={submitCreds} disabled={submitting} backgroundOpacity="opaque">
									{submitting ? 'Connecting…' : 'Connect'}
								</Button>
							</div>
						</div>
					</Tab>

					<Tab title="API Key" tabKey="apikey">
						<div className={css.tabContent}>
							<div className={css.field}>
								<label className={css.label}>Server URL</label>
								<UrlInput
									value={url}
									onChange={setUrl}
									disabled={submitting}
									placeholder="http(s)://…"
								/>
							</div>
							<div className={css.field}>
								<label className={css.label}>API Key</label>
								<FieldRow
									value={apiKey}
									onChange={setApiKey}
									placeholder="API Key"
									disabled={submitting}
									clearLabel="Clear API Key"
								/>
							</div>
							<div className={css.actions}>
								<Button onClick={submitApi} disabled={submitting} backgroundOpacity="opaque">
									{submitting ? 'Connecting…' : 'Connect'}
								</Button>
							</div>
						</div>
					</Tab>
				</TabLayout>

				<ErrorMessage message={error} className={css.error} />
			</div>
		</div>
	);
};
