import {LunaPairingDriver} from './LunaPairingDriver';
import {HttpPairingDriver} from './HttpPairingDriver';
import type {PairingDriver} from './types';

const DEV_SERVICE_BASE = 'http://127.0.0.1:8788';

// WebOSServiceBridge is the transport LS2Request actually uses, so detecting it
// (rather than the legacy PalmServiceBridge) keeps detection and transport in sync.
const hasServiceBridge = (): boolean =>
	typeof (window as {WebOSServiceBridge?: unknown}).WebOSServiceBridge === 'function';

// Returns null when no pairing transport exists (e.g. production build opened
// in a plain browser): the Phone tab is simply not offered.
export function createPairingDriver(): PairingDriver | null {
	if (hasServiceBridge()) return new LunaPairingDriver();
	if (process.env.NODE_ENV !== 'production') return new HttpPairingDriver(DEV_SERVICE_BASE);
	return null;
}
