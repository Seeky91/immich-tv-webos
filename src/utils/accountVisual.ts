import {AuthMethod} from '../api/types';
import type {Account} from './accountsStore';

export const GRADIENT_PALETTE: readonly string[] = [
	'linear-gradient(135deg, #8b5fbf, #5fa8d3)',
	'linear-gradient(135deg, #d35f8b, #bf5f5f)',
	'linear-gradient(135deg, #5fbf8b, #8bd35f)',
	'linear-gradient(135deg, #d3a05f, #bf5f5f)',
	'linear-gradient(135deg, #5f8bd3, #5fd3bf)',
	'linear-gradient(135deg, #bf5fd3, #5f8bd3)',
	'linear-gradient(135deg, #d35f5f, #d3a05f)',
	'linear-gradient(135deg, #5fd35f, #5fbfd3)',
] as const;

export const hostFromUrl = (url: string): string => {
	try {
		const u = new URL(url);
		return u.hostname || url;
	} catch {
		// Strip scheme and port manually as a fallback.
		const withoutScheme = url.replace(/^https?:\/\//, '');
		const withoutPort = withoutScheme.replace(/:\d+.*$/, '');
		return withoutPort.replace(/\/.*$/, '');
	}
};

export function deriveLabel(account: Account): string {
	if (account.method === AuthMethod.USER_CREDENTIALS && account.email) {
		return account.email;
	}
	return hostFromUrl(account.baseUrl);
}

export function deriveInitial(account: Account): string {
	return (deriveLabel(account).match(/\S/)?.[0] ?? '?').toUpperCase();
}

const hash = (s: string): number => {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (h << 5) - h + s.charCodeAt(i);
		h |= 0;
	}
	return Math.abs(h);
};

export function pickGradient(id: string): string {
	const idx = hash(id) % GRADIENT_PALETTE.length;
	const result = GRADIENT_PALETTE[idx];
	// noUncheckedIndexedAccess: palette is non-empty and idx is constrained to its length
	return result as string;
}
