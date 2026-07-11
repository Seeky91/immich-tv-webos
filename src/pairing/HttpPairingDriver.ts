import type {PairingDriver, PairingPollResult, PairingStartInfo, PairedAccountResult} from './types';

interface ControlResponse {
	returnValue: boolean;
	errorText?: string;
	url?: string;
	code?: string;
	state?: string;
	result?: PairedAccountResult;
}

// Desktop-development transport: talks to `node service/dev.js`, which exposes
// the luna methods as HTTP control routes. Never used on the TV.
export class HttpPairingDriver implements PairingDriver {
	private base: string;

	constructor(base: string) {
		this.base = base;
	}

	private async call(method: string, body: Record<string, unknown>): Promise<ControlResponse> {
		const response = await fetch(`${this.base}/pairing/${method}`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});
		const parsed = (await response.json()) as ControlResponse;
		if (!parsed.returnValue) throw new Error(parsed.errorText || 'Pairing service call failed');
		return parsed;
	}

	public async start(suggestedUrl?: string): Promise<PairingStartInfo> {
		const res = await this.call('start', suggestedUrl ? {suggestedUrl} : {});
		if (!res.url || !res.code) throw new Error('Pairing service returned no URL');
		return {url: res.url, code: res.code};
	}

	public async status(): Promise<PairingPollResult> {
		const res = await this.call('status', {});
		if (res.state === 'approved' && res.result) return {state: 'approved', result: res.result};
		if (res.state === 'pending') return {state: 'pending'};
		return {state: 'expired'};
	}

	public async cancel(): Promise<void> {
		await this.call('cancel', {});
	}
}
