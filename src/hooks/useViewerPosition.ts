import {useMemo} from 'react';
import {monthKey} from '../domain/transforms';
import type {DayGroup, TimelineAsset, TimelineBucket} from '../domain/types';

interface PositionTimeline {
	allBuckets: TimelineBucket[];
	loadedMonths: ReadonlyMap<string, DayGroup[]>;
}

const format = (rank: number, total: number) => `${(rank + 1).toLocaleString('en-US')} / ${total.toLocaleString('en-US')}`;

/**
 * "rank / total" label for the viewer. A month-bucket timeline only holds its loaded months, so
 * the library-wide rank comes from bucket counts: assets in earlier months + rank within the
 * asset's own month.
 */
export const useViewerPosition = (timeline: PositionTimeline | undefined, assets: TimelineAsset[], index: number): string => {
	const monthOffsets = useMemo(() => {
		if (!timeline) return null;
		const before = new Map<string, number>();
		const loadedStart = new Map<string, number>();
		let total = 0;
		let loaded = 0;
		for (const bucket of timeline.allBuckets) {
			const month = monthKey(bucket.timeBucket);
			before.set(month, total);
			total += bucket.count;
			const monthGroups = timeline.loadedMonths.get(bucket.timeBucket);
			if (!monthGroups) continue;
			loadedStart.set(month, loaded);
			for (const group of monthGroups) loaded += group.assets.length;
		}
		return {before, loadedStart, total};
	}, [timeline]);

	return useMemo(() => {
		const asset = assets[index];
		if (!asset) return '';
		if (!monthOffsets) return format(index, assets.length);
		const month = monthKey(asset.localDateTime);
		return format((monthOffsets.before.get(month) ?? 0) + index - (monthOffsets.loadedStart.get(month) ?? index), monthOffsets.total);
	}, [assets, index, monthOffsets]);
};
