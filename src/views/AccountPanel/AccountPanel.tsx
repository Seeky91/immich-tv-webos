import React, {useCallback, useMemo, useState} from 'react';
import Button from '@enact/sandstone/Button';
import {AccountGrid} from './AccountGrid';
import {AuthForm, type AuthFormPayload, type AuthSubmitResult} from '../../components/AuthForm/AuthForm';
import {useWebOSKeys} from '../../hooks/useWebOSKeys';
import type {Account} from '../../utils/accountsStore';
import bannerImage from '../../assets/immich-banner.png';
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
	onCloseOverlay,
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

	// Remote Back semantics: on form, peel back to grid; on grid in overlay mode, close
	// the overlay. First-launch grid has no back target (root of app) so we leave the key
	// unhandled and let WAM fall through to its default exit behavior.
	const backHandler = useMemo<(() => void) | undefined>(() => {
		if (subMode === 'form') return goGrid;
		if (mode === 'overlay') return onCloseOverlay;
		return undefined;
	}, [mode, subMode, goGrid, onCloseOverlay]);

	useWebOSKeys({onBack: backHandler});

	if (mode === 'first-launch') {
		if (subMode === 'form') {
			return (
				<div className={css.firstLaunchForm}>
					<AuthForm initialUrl="" onSubmit={handleSubmit} />
				</div>
			);
		}
		return (
			<div className={css.firstLaunch}>
				<img src={bannerImage} alt="Immich" className={css.banner} />
				<h2 className={css.welcomeTitle}>Welcome to Immich for TV</h2>
				<p className={css.welcomeSub}>Add your Immich account to start browsing.</p>
				<Button autoFocus size="large" onClick={goForm} backgroundOpacity="opaque">+ Add account</Button>
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
