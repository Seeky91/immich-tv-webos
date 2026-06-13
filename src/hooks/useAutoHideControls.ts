import {useCallback, useEffect, useRef, useState} from 'react';

interface UseAutoHideControlsOptions {
	enabled: boolean;
	hideDelayMs?: number;
}

interface AutoHideControls {
	visible: boolean;
}

const DEFAULT_HIDE_DELAY_MS = 4000;

// D-pad keys that summon the controls back. Left/Right are deliberately excluded so paging
// through photos stays "silent" (the chrome doesn't flash on every move). OK/Select maps to
// 'Enter' on our target webOS firmwares.
const REVEAL_KEYS = new Set(['Enter', 'ArrowUp', 'ArrowDown']);

export const useAutoHideControls = ({enabled, hideDelayMs = DEFAULT_HIDE_DELAY_MS}: UseAutoHideControlsOptions): AutoHideControls => {
	const [visible, setVisible] = useState(true);
	const [wasEnabled, setWasEnabled] = useState(enabled);
	const timerRef = useRef<number | null>(null);
	const visibleRef = useRef(visible);

	// Reset to visible when auto-hide (re)enables (e.g. moving from a video back to a photo).
	// This adjusts state on a prop change during render — not in an effect — which is the
	// pattern react.dev/learn/you-might-not-need-an-effect prescribes and what satisfies the
	// `react-hooks/set-state-in-effect` rule (Enact CI strict). The disabled case needs no
	// state at all: it's derived in the returned value below.
	if (enabled !== wasEnabled) {
		setWasEnabled(enabled);
		if (enabled) setVisible(true);
	}

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

	useEffect(() => {
		if (!enabled) {
			clearTimer();
			return undefined;
		}

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

		// Capture phase + the stopImmediatePropagation above are load-bearing: Spotlight listens
		// for keydown on window in the BUBBLE phase, so swallowing in the capture phase is what
		// stops it from activating the (hidden) focused control on a reveal press. Do not switch
		// this to the bubble phase or to stopPropagation.
		window.addEventListener('keydown', handleKeyDown, {capture: true});
		return () => {
			window.removeEventListener('keydown', handleKeyDown, {capture: true});
			clearTimer();
		};
	}, [enabled, startTimer, clearTimer]);

	// Derive the disabled case instead of storing it: while auto-hide is off the controls are
	// always shown, whatever internal `visible` state was left over from a previous photo.
	return {visible: enabled ? visible : true};
};
