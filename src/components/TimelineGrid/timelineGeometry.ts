import type {DayGroup, TimelineBucket} from '../../domain/types';

// Keyed by content identity, not position: a month loading above must not remount (and blur)
// the days already on screen.
export interface TimelineDay {
	key: string;
	top: number;
	height: number;
	group: DayGroup;
}

/**
 * Every rendered position in the timeline, in content px, from one source of truth. Unloaded
 * months have no days: they are only space, reserved by the month extents.
 */
export interface TimelineGeometry {
	days: TimelineDay[];
	totalHeight: number;
	// Month extents; empty when the grid shows a plain list of day groups.
	bucketOffsets: number[];
	bucketHeights: number[];
}

interface MonthSkeleton {
	allBuckets: TimelineBucket[];
	loadedMonths: ReadonlyMap<string, DayGroup[]>;
	bucketOffsets: number[];
	bucketHeights: number[];
}

function stackDays(days: TimelineDay[], groups: DayGroup[], top: number, groupHeight: (group: DayGroup) => number): number {
	for (const group of groups) {
		const height = groupHeight(group);
		days.push({key: `day:${group.timeBucket}`, top, height, group});
		top += height;
	}
	return top;
}

export function buildGeometry(groupHeight: (group: DayGroup) => number, source: DayGroup[] | MonthSkeleton): TimelineGeometry {
	const days: TimelineDay[] = [];
	if (Array.isArray(source)) {
		const totalHeight = stackDays(days, source, 0, groupHeight);
		return {days, totalHeight, bucketOffsets: [], bucketHeights: []};
	}
	const {allBuckets, loadedMonths, bucketOffsets, bucketHeights} = source;
	allBuckets.forEach((bucket, bucketIndex) => {
		const monthGroups = loadedMonths.get(bucket.timeBucket);
		if (monthGroups) stackDays(days, monthGroups, bucketOffsets[bucketIndex] ?? 0, groupHeight);
	});
	const last = bucketHeights.length - 1;
	return {days, totalHeight: last >= 0 ? (bucketOffsets[last] ?? 0) + (bucketHeights[last] ?? 0) : 0, bucketOffsets, bucketHeights};
}

/** Index range [start, end) of the items intersecting [top, bottom); items are sorted top to bottom (rows of cards share a top). */
export function itemsInRange(items: ReadonlyArray<{top: number; height: number}>, top: number, bottom: number): [number, number] {
	let low = 0;
	let high = items.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		const item = items[middle]!;
		if (item.top + item.height <= top) low = middle + 1;
		else high = middle;
	}
	let end = low;
	while (end < items.length && items[end]!.top < bottom) end++;
	return [low, end];
}

export function bucketIndexAtOffset(bucketOffsets: number[], bucketHeights: number[], scrollTop: number): number {
	let low = 0;
	let high = bucketOffsets.length - 1;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const start = bucketOffsets[middle] ?? 0;
		const end = start + (bucketHeights[middle] ?? 0);
		if (scrollTop < start) high = middle - 1;
		else if (scrollTop >= end) low = middle + 1;
		else return middle;
	}
	return Math.max(0, Math.min(bucketOffsets.length - 1, low));
}

/**
 * Scroll position in `next` that keeps on-screen content where it was in `previous`.
 *
 * The top-most day in view that exists unchanged in both geometries is pinned: loaded days
 * never change height, so everything inside it stays pixel-identical whatever loaded around
 * it. With no surviving day in view (only an unloaded month's space, e.g. right after a
 * scrubber jump), the position stays at the same fraction of the month at the top.
 */
export function anchoredScrollTop(previous: TimelineGeometry, next: TimelineGeometry, scrollTop: number, viewportHeight: number): number {
	const [start, end] = itemsInRange(previous.days, scrollTop, scrollTop + viewportHeight);
	if (start < end) {
		const nextByKey = new Map(next.days.map((day) => [day.key, day]));
		for (let index = start; index < end; index++) {
			const before = previous.days[index]!;
			const after = nextByKey.get(before.key);
			if (after && after.height === before.height) return scrollTop + after.top - before.top;
		}
	}
	if (!previous.bucketOffsets.length || previous.bucketOffsets.length !== next.bucketOffsets.length) return scrollTop;
	const bucket = bucketIndexAtOffset(previous.bucketOffsets, previous.bucketHeights, scrollTop);
	const previousHeight = previous.bucketHeights[bucket] ?? 0;
	const ratio = previousHeight > 0 ? Math.min(1, Math.max(0, (scrollTop - (previous.bucketOffsets[bucket] ?? 0)) / previousHeight)) : 0;
	return (next.bucketOffsets[bucket] ?? 0) + ratio * (next.bucketHeights[bucket] ?? 0);
}
