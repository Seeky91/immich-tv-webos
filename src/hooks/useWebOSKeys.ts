import {useEffect} from 'react';

interface UseWebOSKeysOptions {
	onBack?: () => void;
}

const WEBOS_BACK_KEY = 461;
const ESCAPE_KEY = 27;

export const useWebOSKeys = ({onBack}: UseWebOSKeysOptions = {}) => {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			/* Handle back button (WebOS key code) */
			if (event.keyCode === WEBOS_BACK_KEY || event.keyCode === ESCAPE_KEY) {
				event.preventDefault();
				event.stopPropagation();
				if (onBack) {
					onBack();
				} else {
					window?.close();
				}
			}
		};

		// Use capture phase to intercept before other handlers
		window.addEventListener('keydown', handleKeyDown, {capture: true});
		return () => window.removeEventListener('keydown', handleKeyDown, {capture: true});
	}, [onBack]);
};
