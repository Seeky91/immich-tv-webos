import LS2Request from '@enact/webos/LS2Request';

const SERVICE = 'luna://com.webos.service.tvpower/power';
const CLIENT_NAME = 'com.seeky91.immichtv.slideshow';
const ignore = () => {};

/**
 * Holds off the TV screen saver until the returned release function is called. webOS has no
 * public API for this: tvpower announces each upcoming activation (state 'Active') to
 * subscribers, and replying ack:false vetoes it. Undocumented, so any failure is silent.
 */
export function holdScreenSaver(): () => void {
	if (typeof (window as {WebOSServiceBridge?: unknown}).WebOSServiceBridge !== 'function') return ignore;
	const subscription = new LS2Request().send({
		service: SERVICE,
		method: 'registerScreenSaverRequest',
		parameters: {clientName: CLIENT_NAME},
		subscribe: true,
		onSuccess: ({state, timestamp}: {state?: string; timestamp?: unknown}) => {
			if (state !== 'Active') return;
			new LS2Request().send({
				service: SERVICE,
				method: 'responseScreenSaverRequest',
				parameters: {clientName: CLIENT_NAME, ack: false, timestamp},
				onFailure: ignore,
			});
		},
		onFailure: ignore,
	});
	return () => subscription?.cancel();
}
