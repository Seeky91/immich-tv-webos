import {useCallback, useEffect, useRef, useState} from 'react';

interface UseAutoHideControlsOptions {
	enabled: boolean;
	hideDelayMs?: number;
}

interface AutoHideControls {
	visible: boolean;
	reveal: () => void;
}

const DEFAULT_HIDE_DELAY_MS = 4000;

// D-pad keys that summon the controls back. Left/Right are deliberately excluded so paging
// through photos stays "silent" (the chrome doesn't flash on every move). OK/Select maps to
// 'Enter' on our target webOS firmwares.
const REVEAL_KEYS = new Set(['Enter', 'ArrowUp', 'ArrowDown']);

export const useAutoHideControls = ({enabled, hideDelayMs = DEFAULT_HIDE_DELAY_MS}: UseAutoHideControlsOptions): AutoHideControls => {
	const [visible, setVisible] = useState(true);
	const timerRef = useRef<number | null>(null);
	const visibleRef = useRef(visible);

	// Mirror `visible` into a ref so the once-installed window listener always reads the
	// current value without re-subscribing. Synced in an effect — never written during render
	// (Enact CI strict forbids ref.current writes in render).
	useEffect(() => {
		visibleRef.current = visible;
	}, [visible]);

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const startTimer = useCallback(() => {
		clearTimer();
		timerRef.current = window.setTimeout(() => {
			setVisible(false);
		}, hideDelayMs);
	}, [clearTimer, hideDelayMs]);

	const reveal = useCallback(() => {
		setVisible(true);
		startTimer();
	}, [startTimer]);

	useEffect(() => {
		if (!enabled) {
			setVisible(true);
			clearTimer();
			return undefined;
		}

		setVisible(true);
		startTimer();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!REVEAL_KEYS.has(event.key)) return;
			if (visibleRef.current) {
				// Already visible: keep it alive, let Spotlight handle the key (move focus / activate).
				startTimer();
				return;
			}
			// Hidden: summon controls and swallow the press so Spotlight doesn't act on a
			// control that is still visually hidden underneath.
			setVisible(true);
			startTimer();
			event.preventDefault();
			event.stopImmediatePropagation();
		};

		window.addEventListener('keydown', handleKeyDown, {capture: true});
		return () => {
			window.removeEventListener('keydown', handleKeyDown, {capture: true});
			clearTimer();
		};
	}, [enabled, startTimer, clearTimer]);

	return {visible, reveal};
};
