import type {TimelineAsset, DayGroup, AssetOrder} from './types';

const dayKey = (isoDate: string): string => isoDate.slice(0, 10);

// 'YYYY-MM' of an asset localDateTime or a bucket timeBucket ('YYYY-MM-01').
export const monthKey = (isoDate: string): string => isoDate.slice(0, 7);

// Day buckets are sorted by `order`; within-day order is preserved from the input array
// (Immich pre-sorts album assets by its `order` preference, so insertion order is already correct).
export function groupAssetsByDay(assets: TimelineAsset[], order: AssetOrder = 'desc'): DayGroup[] {
	const dayMap = new Map<string, TimelineAsset[]>();
	for (const asset of assets) {
		const key = dayKey(asset.localDateTime);
		const bucket = dayMap.get(key);
		if (bucket) {
			bucket.push(asset);
		} else {
			dayMap.set(key, [asset]);
		}
	}

	const compare = order === 'asc' ? (a: string, b: string) => a.localeCompare(b) : (a: string, b: string) => b.localeCompare(a);
	return Array.from(dayMap.entries())
		.sort(([a], [b]) => compare(a, b))
		.map(([date, dayAssets]) => ({
			timeBucket: date,
			assets: dayAssets,
			count: dayAssets.length,
		}));
}
