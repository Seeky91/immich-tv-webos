export type Rotation = 0 | 90 | 180 | 270;

// Viewing preference only: rotations stay on this TV and are never written to the server.
const STORAGE_KEY = 'immich_rotations';
const MAX_ENTRIES = 1000;

let rotations: Record<string, Rotation> | null = null;

function load(): Record<string, Rotation> {
	if (!rotations) {
		try {
			rotations = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
		} catch {
			rotations = {};
		}
	}
	return rotations!;
}

export function getRotation(assetId: string): Rotation {
	return load()[assetId] ?? 0;
}

export function rotateClockwise(assetId: string): Rotation {
	const map = load();
	const next = ((getRotation(assetId) + 90) % 360) as Rotation;
	// Re-inserting keeps keys in recency order (UUID keys preserve insertion order), so the
	// oldest entries are the ones trimmed.
	delete map[assetId];
	if (next) map[assetId] = next;
	const ids = Object.keys(map);
	for (let i = 0; i < ids.length - MAX_ENTRIES; i++) delete map[ids[i]!];
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {
		// Storage unavailable: the rotation still applies for this session.
	}
	return next;
}
