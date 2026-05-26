export function randomId(): string {
	const c = globalThis.crypto;
	if (c && typeof c.randomUUID === 'function') {
		return c.randomUUID();
	}
	// v4 fallback — sufficient for local identifiers (not used as a credential).
	const bytes = new Array<number>(16);
	for (let i = 0; i < 16; i++) {
		bytes[i] = Math.floor(Math.random() * 256);
	}
	bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40;
	bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;
	const hex = bytes.map(b => b.toString(16).padStart(2, '0'));
	return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
