import {useCallback, useEffect, useRef, useState} from 'react';
import type {PairingDriver, PairedAccountResult} from '../pairing/types';
import type {AuthSubmitResult} from '../api/types';

export type PhonePairingState =
	| {phase: 'starting'}
	| {phase: 'waiting'; url: string; code: string}
	| {phase: 'finalizing'}
	| {phase: 'error'; message: string; atStart: boolean};

const POLL_INTERVAL_MS = 2000;
const MAX_CONSECUTIVE_POLL_FAILURES = 5;

const STARTING: PhonePairingState = {phase: 'starting'};

// Drives one pairing session for as long as the caller stays mounted: start the
// service, poll until the phone approves, then hand the result to `onPaired`.
// Unmounting cancels the session; `restart` begins a fresh one.
export const usePhonePairing = (
	driver: PairingDriver,
	suggestedUrl: string,
	onPaired: (result: PairedAccountResult) => Promise<AuthSubmitResult>,
) => {
	// Async updates are tagged with their attempt so a canceled session can never
	// overwrite the state of the next one; until the current attempt reports, the
	// state is STARTING. This also keeps setState out of the effect body (CI lint).
	const [attempt, setAttempt] = useState(0);
	const [snapshot, setSnapshot] = useState<{attempt: number; state: PhonePairingState} | null>(null);

	const onPairedRef = useRef(onPaired);
	useEffect(() => {
		onPairedRef.current = onPaired;
	}, [onPaired]);

	// Captured per attempt: typing a URL in another tab must not restart pairing.
	const suggestedUrlRef = useRef(suggestedUrl);
	useEffect(() => {
		suggestedUrlRef.current = suggestedUrl;
	}, [suggestedUrl]);

	const restart = useCallback(() => setAttempt(a => a + 1), []);

	useEffect(() => {
		let disposed = false;
		let timer: number | undefined;
		let pollFailures = 0;

		const update = (state: PhonePairingState) => {
			if (!disposed) setSnapshot({attempt, state});
		};

		const poll = () => {
			timer = window.setTimeout(() => {
				driver.status().then(
					res => {
						if (disposed) return;
						pollFailures = 0;
						if (res.state === 'pending') {
							poll();
							return;
						}
						if (res.state === 'expired') {
							update({phase: 'error', message: 'The code expired. Start again.', atStart: false});
							return;
						}
						update({phase: 'finalizing'});
						void onPairedRef.current(res.result).then(login => {
							// On success the login screen unmounts; nothing to update.
							if (!login.success) {
								update({phase: 'error', message: login.errorMessage, atStart: false});
							}
						});
					},
					() => {
						if (disposed) return;
						pollFailures += 1;
						if (pollFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
							update({phase: 'error', message: 'Lost contact with the pairing service.', atStart: false});
							return;
						}
						poll();
					},
				);
			}, POLL_INTERVAL_MS);
		};

		driver.start(suggestedUrlRef.current || undefined).then(
			info => {
				if (disposed) return;
				update({phase: 'waiting', url: info.url, code: info.code});
				poll();
			},
			error => {
				update({
					phase: 'error',
					message: error instanceof Error ? error.message : 'Could not start phone sign-in',
					atStart: true,
				});
			},
		);

		return () => {
			disposed = true;
			if (timer !== undefined) window.clearTimeout(timer);
			driver.cancel().catch(() => undefined);
		};
	}, [driver, attempt]);

	const state: PhonePairingState = snapshot && snapshot.attempt === attempt ? snapshot.state : STARTING;

	return {state, restart};
};
