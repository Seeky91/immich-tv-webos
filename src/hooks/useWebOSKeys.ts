import {useEffect} from 'react';

interface UseWebOSKeysOptions {
	onBack?: () => void;
	onArrowLeft?: () => void;
	onArrowRight?: () => void;
}

// LG remote Back fires a different keyCode depending on the webOS / WAM version. We support
// all the ones we've observed plus Escape for dev mode in a desktop browser:
//   - 461   : VK_BACK on older webOS (matches Enact's ThemeDecorator default of cancel: 461)
//   - 1536  : observed on webOS 10.x via Chrome/120 WAM (ares-inspect capture on Quentin's TV)
//   - 8     : Backspace fallback (some firmwares re-map Back to it) — gated on focus, see below
//   - 10009 : Tizen-style back (Tizen TVs and a handful of LG firmwares)
//   - 27    : Escape, for dev browsers
const BACK_KEYCODES = new Set([461, 1536, 8, 10009, 27]);
const BACKSPACE_KEYCODE = 8;

// Backspace is overloaded: it's the on-remote Back on a few firmwares AND the
// delete-previous-character key on any input (USB keyboard or webOS virtual keyboard).
// When focus is on an editable element we let the native editor handle it; everywhere
// else we keep the Back fallback behavior.
function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA';
}

// Back handlers are tracked in a stack so the most recently mounted hook wins. This lets
// nested screens (e.g. AlbumView → MediaViewer) coexist: opening the viewer pushes its
// onClose to the top, closing it pops it, then the album-level back becomes active again.
const backStack: Array<() => void> = [];

function fireTopBack(): boolean {
	const top = backStack[backStack.length - 1];
	if (!top) return false;
	top();
	return true;
}

let bridgeInstalled = false;

// Installs the global Back key listener once per app. On webOS, WAM dispatches the remote
// Back as a DOM keydown event on window (we verified this via ares-inspect on a real TV).
// If our handler calls preventDefault, WAM suppresses its default "Close app?" dialog and
// the press is consumed by the app. If no handler is on the back-stack — e.g. we're at the
// root view — we let WAM proceed and the user exits the app naturally.
function ensureBridgeInstalled(): void {
	if (bridgeInstalled || typeof window === 'undefined') return;
	bridgeInstalled = true;

	window.addEventListener(
		'keydown',
		(event: KeyboardEvent) => {
			if (!BACK_KEYCODES.has(event.keyCode)) return;
			if (event.keyCode === BACKSPACE_KEYCODE && isEditableTarget(event.target)) return;
			if (fireTopBack()) {
				event.preventDefault();
				// stopImmediatePropagation (not stopPropagation) so sibling window-level listeners
				// don't all fire the same back action — otherwise an album-and-viewer combo would
				// pop both layers on a single press.
				event.stopImmediatePropagation();
			}
		},
		{capture: true}
	);
}

export const useWebOSKeys = ({onBack, onArrowLeft, onArrowRight}: UseWebOSKeysOptions = {}) => {
	useEffect(() => {
		ensureBridgeInstalled();

		if (onBack) backStack.push(onBack);

		const handleArrowKeys = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft' && onArrowLeft) {
				event.preventDefault();
				onArrowLeft();
			} else if (event.key === 'ArrowRight' && onArrowRight) {
				event.preventDefault();
				onArrowRight();
			}
		};
		const needsArrowListener = !!(onArrowLeft || onArrowRight);
		if (needsArrowListener) {
			window.addEventListener('keydown', handleArrowKeys, {capture: true});
		}

		return () => {
			if (onBack) {
				const idx = backStack.lastIndexOf(onBack);
				if (idx >= 0) backStack.splice(idx, 1);
			}
			if (needsArrowListener) {
				window.removeEventListener('keydown', handleArrowKeys, {capture: true});
			}
		};
	}, [onBack, onArrowLeft, onArrowRight]);
};
