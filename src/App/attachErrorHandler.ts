import {onWindowReady} from '@enact/core/snapshot';
import {error} from '@enact/webos/pmloglib';

const handleError = (ev: ErrorEvent) => {
	let stack = (ev.error && ev.error.stack) || null;

	if (stack && stack.length > 512) {
		stack = ev.error.stack.substring(0, 512);
	}

	error(
		'app.onerror',
		{
			message: ev.message,
			url: ev.filename,
			line: ev.lineno,
			column: ev.colno,
			stack,
		},
		''
	);

	// Calling preventDefault() will avoid logging the error to the console
	// ev.preventDefault();
};

onWindowReady(() => {
	window.addEventListener('error', handleError);
});
