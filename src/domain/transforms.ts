import type {ColumnarAssetResponse} from '../api/types';
import type {TimelineAsset, DayGroup, AssetOrder} from './types';

const dayKey = (isoDate: string): string => isoDate.slice(0, 10);

export function transformColumnarResponse(columnar: ColumnarAssetResponse): TimelineAsset[] {
	const len = columnar.id.length;
	const ratios = columnar.ratio?.length === len ? columnar.ratio : null;
	return columnar.id.map((id, i) => ({
		id,
		type: columnar.isImage[i]! ? 'IMAGE' : 'VIDEO',
		ratio: ratios ? ratios[i]! : 1,
		fileCreatedAt: columnar.fileCreatedAt[i]!,
		duration: columnar.duration[i] ?? null,
	}));
}

// Day buckets are sorted by `order`; within-day order is preserved from the input array
// (Immich pre-sorts album assets by its `order` preference, so insertion order is already correct).
export function groupAssetsByDay(assets: TimelineAsset[], order: AssetOrder = 'desc'): DayGroup[] {
	const dayMap = new Map<string, TimelineAsset[]>();
	for (const asset of assets) {
		const key = dayKey(asset.fileCreatedAt);
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
