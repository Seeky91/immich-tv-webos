import type {ColumnarAssetResponse} from '../api/types';
import type {TimelineAsset, DayGroup} from './types';

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

export function groupAssetsByDay(assets: TimelineAsset[]): DayGroup[] {
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

	return Array.from(dayMap.entries())
		.sort(([a], [b]) => b.localeCompare(a))
		.map(([date, dayAssets]) => ({
			timeBucket: date,
			assets: dayAssets,
			count: dayAssets.length,
		}));
}
