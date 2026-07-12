import type {PairingDriver, PairingStartInfo, PairingPollResult} from './types';
import type {PairingServiceResponse} from './serviceResponse';
import {parseStartInfo, parsePollResult} from './serviceResponse';

// Desktop-development transport: talks to `node service/dev.js`, which exposes
// the luna methods as HTTP control routes. Never used on the TV.
export class HttpPairingDriver implements PairingDriver {
	private base: string;

	constructor(base: string) {
		this.base = base;
	}

	private async call(method: string, body: Record<string, unknown>): Promise<PairingServiceResponse> {
		const response = await fetch(`${this.base}/pairing/${method}`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});
		const parsed = (await response.json()) as PairingServiceResponse;
		if (!parsed.returnValue) throw new Error(parsed.errorText || 'Pairing service call failed');
		return parsed;
	}

	public async start(suggestedUrl?: string): Promise<PairingStartInfo> {
		return parseStartInfo(await this.call('start', suggestedUrl ? {suggestedUrl} : {}));
	}

	public async status(): Promise<PairingPollResult> {
		return parsePollResult(await this.call('status', {}));
	}

	public async cancel(): Promise<void> {
		await this.call('cancel', {});
	}
}
