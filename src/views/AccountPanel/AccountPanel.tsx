import React, {useCallback, useState} from 'react';
import {AccountGrid} from './AccountGrid';
import {AuthForm, type AuthFormPayload, type AuthSubmitResult} from '../../components/AuthForm/AuthForm';
import type {Account} from '../../utils/accountsStore';
import css from './AccountPanel.module.less';

export type AccountPanelMode = 'first-launch' | 'overlay';

interface AccountPanelProps {
	mode: AccountPanelMode;
	accounts: Account[];
	activeAccountId: string | null;
	defaultAccountId: string | null;
	onSwitch: (id: string) => void;
	onSetDefault: (id: string | null) => void;
	onRemove: (id: string) => void;
	onAddAccount: (payload: AuthFormPayload) => Promise<AuthSubmitResult>;
	onCloseOverlay?: () => void;
}

export const AccountPanel: React.FC<AccountPanelProps> = ({
	mode,
	accounts,
	activeAccountId,
	defaultAccountId,
	onSwitch,
	onSetDefault,
	onRemove,
	onAddAccount,
}) => {
	// Both modes start on 'grid'. In first-launch mode 'grid' renders the welcome screen
	// (since accounts.length === 0 means no cards to draw); the user clicks the CTA
	// to transition into 'form'.
	const [subMode, setSubMode] = useState<'grid' | 'form'>('grid');

	const goForm = useCallback(() => setSubMode('form'), []);
	const goGrid = useCallback(() => setSubMode('grid'), []);

	const activeBaseUrl = accounts.find(a => a.id === activeAccountId)?.baseUrl ?? '';

	const handleSubmit = useCallback(
		async (payload: AuthFormPayload): Promise<AuthSubmitResult> => {
			const result = await onAddAccount(payload);
			if (result.success && mode === 'overlay') {
				setSubMode('grid');
			}
			return result;
		},
		[mode, onAddAccount],
	);

	if (mode === 'first-launch') {
		return (
			<div className={css.firstLaunch}>
				{subMode === 'form' ? (
					<AuthForm initialUrl="" onSubmit={handleSubmit} />
				) : (
					<>
						<h2 className={css.welcomeTitle}>Welcome to Immich for TV</h2>
						<p className={css.welcomeSub}>Add your Immich account to start browsing.</p>
						<button className={css.welcomeCta} onClick={goForm}>+ Add account</button>
					</>
				)}
			</div>
		);
	}

	return (
		<div className={css.overlay}>
			<div className={css.panel}>
				{subMode === 'grid' ? (
					<AccountGrid
						accounts={accounts}
						activeAccountId={activeAccountId}
						defaultAccountId={defaultAccountId}
						onSwitch={onSwitch}
						onSetDefault={onSetDefault}
						onRemove={onRemove}
						onAdd={goForm}
					/>
				) : (
					<AuthForm
						initialUrl={activeBaseUrl}
						onSubmit={handleSubmit}
						onBack={accounts.length > 0 ? goGrid : undefined}
					/>
				)}
			</div>
		</div>
	);
};
