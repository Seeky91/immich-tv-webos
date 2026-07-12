import type {PairingStartInfo, PairingPollResult, PairedAccountResult} from './types';

// Raw envelope returned by the pairing service, identical whether it arrives over
// the luna bus (TV) or the dev HTTP mirror. Both drivers parse this one contract
// so a service change lands in a single place instead of two parallel copies.
export interface PairingServiceResponse {
	returnValue: boolean;
	errorText?: string;
	url?: string;
	code?: string;
	state?: string;
	result?: PairedAccountResult;
}

export function parseStartInfo(res: PairingServiceResponse): PairingStartInfo {
	if (!res.url || !res.code) throw new Error('Pairing service returned no URL');
	return {url: res.url, code: res.code};
}

export function parsePollResult(res: PairingServiceResponse): PairingPollResult {
	if (res.state === 'approved' && res.result) return {state: 'approved', result: res.result};
	if (res.state === 'pending') return {state: 'pending'};
	// none/consumed/expired: the session is gone either way — restart.
	return {state: 'expired'};
}
