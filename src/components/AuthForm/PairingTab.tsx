import React, {useEffect, useRef} from 'react';
import Button from '@enact/sandstone/Button';
import {ErrorMessage} from '../ErrorMessage';
import {QrCode} from '../QrCode/QrCode';
import {usePhonePairing, type PairedLoginResult} from '../../hooks/usePhonePairing';
import type {PairingDriver, PairedAccountResult} from '../../pairing/types';
import css from './PairingTab.module.less';

interface PairingTabProps {
	driver: PairingDriver;
	suggestedUrl: string;
	onPaired: (result: PairedAccountResult) => Promise<PairedLoginResult>;
	// Fired when the pairing service can't even start (e.g. broken install):
	// lets AuthForm fall back to the Email tab.
	onStartFailed?: () => void;
}

export const PairingTab: React.FC<PairingTabProps> = ({driver, suggestedUrl, onPaired, onStartFailed}) => {
	const {state, restart} = usePhonePairing(driver, suggestedUrl, onPaired);

	const startFailedRef = useRef(onStartFailed);
	useEffect(() => {
		startFailedRef.current = onStartFailed;
	}, [onStartFailed]);
	const failedAtStart = state.phase === 'error' && state.atStart;
	useEffect(() => {
		if (failedAtStart && startFailedRef.current) startFailedRef.current();
	}, [failedAtStart]);

	if (state.phase === 'waiting') {
		const manualUrl = state.url.replace(/\?.*$/, '');
		return (
			<div className={css.pairing}>
				<QrCode value={state.url} className={css.qr} />
				<div className={css.details}>
					<p className={css.step}>1. Connect your phone to the same Wi-Fi as this TV</p>
					<p className={css.step}>
						2. Scan the code — or visit <span className={css.url}>{manualUrl}</span> and enter the code below
					</p>
					<p className={css.step}>3. Sign in to your Immich server</p>
					<div className={css.codeRow}>
						<span className={css.codeLabel}>Code</span>
						<span className={css.code}>{state.code}</span>
					</div>
					<p className={css.status}>Waiting for your phone…</p>
				</div>
			</div>
		);
	}

	if (state.phase === 'error') {
		return (
			<div className={css.message}>
				<ErrorMessage message={state.message} />
				<div className={css.retry}>
					<Button size="small" onClick={restart} backgroundOpacity="opaque">
						Try again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={css.message}>
			<p className={css.status}>{state.phase === 'finalizing' ? 'Signing in…' : 'Preparing phone sign-in…'}</p>
		</div>
	);
};
