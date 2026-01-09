import React, {useState, useCallback} from 'react';
import TabLayout, {Tab} from '@enact/sandstone/TabLayout';
import Input from '@enact/sandstone/Input';
import Button from '@enact/sandstone/Button';
import BodyText from '@enact/sandstone/BodyText';
import Icon from '@enact/sandstone/Icon';

import css from './LoginPanel.module.less';
import bannerImage from '../../immich-banner.png';

interface LoginPanelProps {
	isValidating: boolean;
	onLoginWithApiKey: (baseUrl: string, apiKey: string) => Promise<boolean>;
	onLoginWithCredentials: (baseUrl: string, email: string, password: string) => Promise<boolean>;
}

const LoginPanel: React.FC<LoginPanelProps> = ({isValidating, onLoginWithApiKey, onLoginWithCredentials}) => {
	const [apiKeyUrl, setApiKeyUrl] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [apiKeyError, setApiKeyError] = useState('');

	const [credentialsUrl, setCredentialsUrl] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [credentialsError, setCredentialsError] = useState('');

	const handleApiKeyUrlChange = useCallback((e: any) => setApiKeyUrl(e.value), []);
	const handleApiKeyChange = useCallback((e: any) => setApiKey(e.value), []);

	const handleApiKeySubmit = useCallback(async () => {
		setApiKeyError('');
		if (!apiKeyUrl || !apiKey) {
			setApiKeyError('Please enter both URL and API key');
			return;
		}

		const success = await onLoginWithApiKey(apiKeyUrl, apiKey);
		if (!success) {
			setApiKeyError('Failed to connect. Check your URL and API key.');
		}
	}, [apiKeyUrl, apiKey, onLoginWithApiKey]);

	const handleCredentialsUrlChange = useCallback((e: any) => setCredentialsUrl(e.value), []);
	const handleEmailChange = useCallback((e: any) => setEmail(e.value), []);
	const handlePasswordChange = useCallback((e: any) => setPassword(e.value), []);

	const handleCredentialsSubmit = useCallback(async () => {
		setCredentialsError('');
		if (!credentialsUrl || !email || !password) {
			setCredentialsError('Please fill in all fields');
			return;
		}
		const success = await onLoginWithCredentials(credentialsUrl, email, password);
		if (!success) {
			setCredentialsError('Login failed. Check your credentials.');
		}
	}, [credentialsUrl, email, password, onLoginWithCredentials]);

	return (
		<div className={css.container}>
			<img src={bannerImage} alt="Immich" className={css.banner} />

			<div className={css.formContainer}>
				<TabLayout className={css.layout} orientation="vertical">
					<Tab title="🔑 API" tabKey="apikey">
						<div className={css.tabContent}>
							<div className={css.inputGroup}>
								<Input autoFocus size="large" placeholder="Server URL (ex: https://immich.local)" value={apiKeyUrl} onChange={handleApiKeyUrlChange} disabled={isValidating} />
							</div>

							<div className={css.inputGroup}>
								<Input size="large" placeholder="API Key" value={apiKey} onChange={handleApiKeyChange} disabled={isValidating} />
							</div>

							{apiKeyError && (
								<BodyText className={css.errorMessage} size="small">
									<Icon size="small">alert02</Icon>
									{apiKeyError}
								</BodyText>
							)}

							<Button className={css.submitButton} onClick={handleApiKeySubmit} disabled={isValidating} size="large" backgroundOpacity="opaque">
								{isValidating ? 'Connecting…' : 'Connect'}
							</Button>
						</div>
					</Tab>

					<Tab title="📧 Account" tabKey="credentials">
						<div className={css.tabContent}>
							<div className={css.inputGroup}>
								<Input autoFocus size="large" placeholder="Server URL" value={credentialsUrl} onChange={handleCredentialsUrlChange} disabled={isValidating} />
							</div>

							<div className={css.inputGroup}>
								<Input size="large" placeholder="Email" value={email} onChange={handleEmailChange} disabled={isValidating} />
							</div>

							<div className={css.inputGroup}>
								<Input size="large" type="password" placeholder="Password" value={password} onChange={handlePasswordChange} disabled={isValidating} />
							</div>

							{credentialsError && (
								<BodyText className={css.errorMessage} size="small">
									<Icon size="small">alert02</Icon>
									{credentialsError}
								</BodyText>
							)}

							<Button className={css.submitButton} onClick={handleCredentialsSubmit} disabled={isValidating} size="large" backgroundOpacity="opaque">
								{isValidating ? 'Logging in…' : 'Login'}
							</Button>
						</div>
					</Tab>
				</TabLayout>
			</div>
		</div>
	);
};

export default LoginPanel;
