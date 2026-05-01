/* global ENACT_PACK_ISOMORPHIC */
import React from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';

import App from './App/App';

const appElement = <App />;

if (typeof window !== 'undefined') {
	const rootElement = document.getElementById('root');
	if (rootElement) {
		if (ENACT_PACK_ISOMORPHIC) {
			hydrateRoot(rootElement, appElement);
		} else {
			createRoot(rootElement).render(appElement);
		}
	}
}

export default appElement;
