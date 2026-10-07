import {anchoredScrollTop, buildGeometry, itemsInRange} from './timelineGeometry';
import type {DayGroup, TimelineBucket} from '../../domain/types';

const day = (timeBucket: string, count = 1): DayGroup => ({
	timeBucket,
	assets: Array.from({length: count}, (_, i) => ({id: `${timeBucket}-${i}`, type: 'IMAGE' as const, ratio: 1.5, localDateTime: `${timeBucket}T12:00:00.000Z`, durationSeconds: null})),
	count,
});

const buckets: TimelineBucket[] = [
	{timeBucket: '2026-07-01', count: 2},
	{timeBucket: '2026-06-01', count: 2},
	{timeBucket: '2026-05-01', count: 2},
];

const heights: Record<string, number> = {'2026-07-02': 300, '2026-07-01': 200, '2026-06-20': 400, '2026-06-10': 600, '2026-05-05': 700};
const groupHeight = (group: DayGroup) => heights[group.timeBucket] ?? 0;

// Month heights are either the frozen estimate (unloaded) or the sum of their days.
function months(loaded: Record<string, DayGroup[]>, estimate = 1000) {
	const loadedMonths = new Map(Object.entries(loaded));
	const bucketHeights = buckets.map((bucket) => loadedMonths.get(bucket.timeBucket)?.reduce((sum, group) => sum + groupHeight(group), 0) ?? estimate);
	const bucketOffsets = bucketHeights.map((_, index) => bucketHeights.slice(0, index).reduce((sum, height) => sum + height, 0));
	return buildGeometry(groupHeight, {allBuckets: buckets, loadedMonths, bucketOffsets, bucketHeights});
}

const july = [day('2026-07-02'), day('2026-07-01')];
const june = [day('2026-06-20'), day('2026-06-10')];

describe('buildGeometry', () => {
	test('stacks loaded days at their month offset, unloaded months only reserving space', () => {
		const geometry = months({'2026-06-01': june});
		expect(geometry.days.map((item) => [item.key, item.top, item.height])).toEqual([
			['day:2026-06-20', 1000, 400],
			['day:2026-06-10', 1400, 600],
		]);
		expect(geometry.totalHeight).toBe(3000);
	});

	test('stacks a plain list of days', () => {
		const geometry = buildGeometry(groupHeight, july);
		expect(geometry.days.map((item) => item.top)).toEqual([0, 300]);
		expect(geometry.totalHeight).toBe(500);
		expect(geometry.bucketOffsets).toEqual([]);
	});
});

describe('itemsInRange', () => {
	const items = [
		{top: 0, height: 100},
		{top: 100, height: 100},
		{top: 100, height: 100},
		{top: 200, height: 50},
		{top: 250, height: 500},
	];

	test('returns the items intersecting the range, rows sharing a top included', () => {
		expect(itemsInRange(items, 150, 260)).toEqual([1, 5]);
		expect(itemsInRange(items, 0, 100)).toEqual([0, 1]);
		expect(itemsInRange(items, 800, 900)).toEqual([5, 5]);
	});
});

describe('anchoredScrollTop', () => {
	test('a month loading below leaves the on-screen content in place', () => {
		const before = months({'2026-07-01': july});
		const after = months({'2026-07-01': july, '2026-06-01': june});
		expect(anchoredScrollTop(before, after, 250, 400)).toBe(250);
	});

	test('a month loading above shifts the scroll position by its height change', () => {
		const before = months({'2026-06-01': june});
		const after = months({'2026-07-01': july, '2026-06-01': june});
		// July's estimate (1000) became 500: June, on screen, moved up by 500.
		expect(anchoredScrollTop(before, after, 1200, 400)).toBe(700);
	});

	test('pins loaded content below a month that just loaded at the top of the viewport', () => {
		const before = months({'2026-06-01': june});
		const after = months({'2026-07-01': july, '2026-06-01': june});
		// Viewport [900, 1300): the end of July's reserved space, then June's first day.
		expect(anchoredScrollTop(before, after, 900, 400)).toBe(400);
	});

	test('stays at the start of a month that loads after a jump, whatever follows it in view', () => {
		const before = months({});
		const after = months({'2026-06-01': [day('2026-06-20')]});
		// Jumped to June's top: only unloaded space in view, then June loads short.
		expect(anchoredScrollTop(before, after, 1000, 1500)).toBe(1000);
	});

	test('keeps the relative position inside a month that loaded under the whole viewport', () => {
		const before = months({});
		const after = months({'2026-06-01': june});
		// 25% into June's estimate stays 25% into June once loaded, whatever its real height.
		expect(anchoredScrollTop(before, after, 1250, 400)).toBe(1250);
		const shorter = months({'2026-06-01': [day('2026-06-20')]});
		expect(anchoredScrollTop(before, shorter, 1250, 400)).toBe(1100);
	});
});
