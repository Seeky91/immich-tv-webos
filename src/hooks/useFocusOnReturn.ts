import {useEffect, useRef} from 'react';
import {forceFocus} from '../utils/spotlight';

/**
 * Re-focuses the card that opened a detail view once the user comes back to the list. The list
 * remounts when the detail view closes, so Spotlight would otherwise leave focus nowhere and
 * the next key would land on the navigation rail.
 */
export function useFocusOnReturn(openedKey: string | null, spotlightIdFor: (key: string) => string): void {
	const lastOpenedRef = useRef<string | null>(null);
	useEffect(() => {
		if (openedKey) {
			lastOpenedRef.current = openedKey;
			return;
		}
		const last = lastOpenedRef.current;
		lastOpenedRef.current = null;
		if (last) forceFocus(spotlightIdFor(last));
	}, [openedKey, spotlightIdFor]);
}
