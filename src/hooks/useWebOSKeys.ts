import {useEffect} from 'react';

interface UseWebOSKeysOptions {
	onBack?: () => void;
	onArrowLeft?: () => void;
	onArrowRight?: () => void;
}

const WEBOS_BACK_KEY = 461;
const ESCAPE_KEY = 27;

export const useWebOSKeys = ({onBack, onArrowLeft, onArrowRight}: UseWebOSKeysOptions = {}) => {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.keyCode === WEBOS_BACK_KEY || event.keyCode === ESCAPE_KEY) {
				event.preventDefault();
				event.stopPropagation();
				if (onBack) {
					onBack();
				} else {
					window?.close();
				}
			} else if (event.key === 'ArrowLeft' && onArrowLeft) {
				event.preventDefault();
				onArrowLeft();
			} else if (event.key === 'ArrowRight' && onArrowRight) {
				event.preventDefault();
				onArrowRight();
			}
		};

		// Use capture phase to intercept before other handlers
		window.addEventListener('keydown', handleKeyDown, {capture: true});
		return () => window.removeEventListener('keydown', handleKeyDown, {capture: true});
	}, [onBack, onArrowLeft, onArrowRight]);
};
