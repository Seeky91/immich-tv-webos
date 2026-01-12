/* global ENACT_PACK_ISOMORPHIC */
import React from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';

import App from './App/App';
// import reportWebVitals from './reportWebVitals';

const appElement = <App />;

// In a browser environment, render instead of exporting
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint.
// Learn more: https://github.com/enactjs/cli/blob/master/docs/measuring-performance.md
// reportWebVitals();
