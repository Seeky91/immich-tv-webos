import {useMemo} from 'react';
import ri from '@enact/ui/resolution';
import {calculateJustifiedLayout} from '../utils/justifiedLayout';
import type {JustifiedLayoutResult} from '../utils/justifiedLayout';
import {TARGET_ROW_HEIGHT_PX, GRID_GAP_PX, GRID_HORIZONTAL_PADDING_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX} from '../utils/constants';
import type {TimelineBucket, DayGroup} from '../domain/types';

// loadedGroups gets a fresh array identity every month-load; without this cache the memo would
// recompute every already-loaded group's layout (frozen once loaded), not just new ones — O(months^2)
// over a deep scroll session. Keyed by DayGroup identity (not the 'YYYY-MM-DD' string) so same-day
// groups from different accounts can't collide. Module-scoped (not a ref) to stay render-pure.
const layoutCache = new WeakMap<DayGroup, {width: number; layout: JustifiedLayoutResult}>();

interface UseTimelineLayoutOptions {
	allBuckets: TimelineBucket[];
	loadedMonths: ReadonlyMap<string, DayGroup[]>;
	loadedGroups: DayGroup[];
	viewportWidth: number;
}

export const useTimelineLayout = ({allBuckets, loadedMonths, loadedGroups, viewportWidth}: UseTimelineLayoutOptions) => {
	const headerBlock = ri.scale(BUCKET_HEADER_HEIGHT_PX) + ri.scale(BUCKET_HEADER_MARGIN_PX);

	const layoutMap = useMemo(() => {
		const map = new Map<string, JustifiedLayoutResult>();
		for (const group of loadedGroups) {
			const cached = layoutCache.get(group);
			let layout = cached && cached.width === viewportWidth ? cached.layout : undefined;
			if (!layout) {
				layout = calculateJustifiedLayout(
					group.assets.map((a) => a.ratio),
					viewportWidth
				);
				layoutCache.set(group, {width: viewportWidth, layout});
			}
			map.set(group.timeBucket, layout);
		}
		return map;
	}, [loadedGroups, viewportWidth]);

	const heightMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const [timeBucket, layout] of layoutMap) {
			map.set(timeBucket, headerBlock + layout.totalHeight);
		}
		return map;
	}, [layoutMap, headerBlock]);

	// Frozen estimate for unloaded months, mirroring the Immich web client: assume 3:2 assets
	// with a 0.7 packing factor, plus one header. Depending only on count + viewport width keeps
	// every unloaded offset stable, so heights only change at the (compensable) moment a month loads.
	const estimatedMonthHeights = useMemo(() => {
		const rowHeight = ri.scale(TARGET_ROW_HEIGHT_PX);
		const gap = ri.scale(GRID_GAP_PX);
		const usableWidth = Math.max(rowHeight, viewportWidth - ri.scale(GRID_HORIZONTAL_PADDING_PX));
		return allBuckets.map((bucket) => {
			const unwrappedWidth = 1.5 * bucket.count * rowHeight * 0.7;
			const rows = Math.max(1, Math.ceil(unwrappedWidth / usableWidth));
			return headerBlock + rows * (rowHeight + gap);
		});
	}, [allBuckets, headerBlock, viewportWidth]);

	const bucketHeights = useMemo(
		() =>
			allBuckets.map((bucket, index) => {
				const monthGroups = loadedMonths.get(bucket.timeBucket);
				if (!monthGroups) return estimatedMonthHeights[index] ?? 0;
				return monthGroups.reduce((sum, group) => sum + (heightMap.get(group.timeBucket) ?? 0), 0);
			}),
		[allBuckets, estimatedMonthHeights, heightMap, loadedMonths]
	);

	const bucketOffsets = useMemo(() => {
		const offsets = new Array<number>(bucketHeights.length);
		let offset = 0;
		for (let index = 0; index < bucketHeights.length; index++) {
			offsets[index] = offset;
			offset += bucketHeights[index] ?? 0;
		}
		return offsets;
	}, [bucketHeights]);

	return {
		layoutMap,
		heightMap,
		bucketHeights,
		bucketOffsets,
	};
};
