import LS2Request from '@enact/webos/LS2Request';
import type {PairingDriver, PairingPollResult, PairingStartInfo, PairedAccountResult} from './types';

const SERVICE = 'luna://com.seeky91.immichtv.service';
const CALL_TIMEOUT_MS = 10000;

interface LunaResponse {
	returnValue: boolean;
	errorText?: string;
	url?: string;
	code?: string;
	state?: string;
	result?: PairedAccountResult;
}

function lunaCall(method: string, parameters: Record<string, unknown>): Promise<LunaResponse> {
	return new Promise((resolve, reject) => {
		new LS2Request().send({
			service: SERVICE,
			method,
			parameters,
			timeout: CALL_TIMEOUT_MS,
			onSuccess: resolve,
			onFailure: (res: LunaResponse) => reject(new Error(res.errorText || 'Pairing service call failed')),
			onTimeout: () => reject(new Error('Pairing service did not respond')),
		});
	});
}

const toPollResult = (res: LunaResponse): PairingPollResult => {
	if (res.state === 'approved' && res.result) return {state: 'approved', result: res.result};
	if (res.state === 'pending') return {state: 'pending'};
	// none/consumed/expired: the session is gone either way — restart.
	return {state: 'expired'};
};

export class LunaPairingDriver implements PairingDriver {
	public async start(suggestedUrl?: string): Promise<PairingStartInfo> {
		const res = await lunaCall('start', suggestedUrl ? {suggestedUrl} : {});
		if (!res.url || !res.code) throw new Error('Pairing service returned no URL');
		return {url: res.url, code: res.code};
	}

	public async status(): Promise<PairingPollResult> {
		return toPollResult(await lunaCall('status', {}));
	}

	public async cancel(): Promise<void> {
		await lunaCall('cancel', {});
	}
}
