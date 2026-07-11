export interface PairedAccountResult {
	baseUrl: string;
	email: string;
	accessToken: string;
}

export interface PairingStartInfo {
	url: string;
	code: string;
}

export type PairingPollResult =
	| {state: 'pending'}
	| {state: 'approved'; result: PairedAccountResult}
	| {state: 'expired'};

// Transport to the pairing service: luna bus on the TV, plain HTTP against
// `node service/dev.js` during desktop development.
export interface PairingDriver {
	start(suggestedUrl?: string): Promise<PairingStartInfo>;
	status(): Promise<PairingPollResult>;
	cancel(): Promise<void>;
}
