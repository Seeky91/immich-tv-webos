import {renderHook} from '@testing-library/react';
import {useTimelineLayout} from './useTimelineLayout';
import {calculateJustifiedLayout} from '../utils/justifiedLayout';
import type {DayGroup, TimelineAsset, TimelineBucket} from '../domain/types';

let assetSeq = 0;
const asset = (ratio: number): TimelineAsset => ({
	id: `a${assetSeq++}`,
	type: 'IMAGE',
	ratio,
	localDateTime: '2026-07-01T12:00:00.000Z',
	durationSeconds: null,
});

const group = (timeBucket: string, ratios: number[]): DayGroup => ({
	timeBucket,
	assets: ratios.map(asset),
	count: ratios.length,
});

const ratios = (g: DayGroup) => g.assets.map((a) => a.ratio);

const render = (loadedGroups: DayGroup[], width = 1640) =>
	renderHook((props) => useTimelineLayout(props), {
		initialProps: {allBuckets: [] as TimelineBucket[], loadedMonths: new Map<string, DayGroup[]>(), loadedGroups, viewportWidth: width},
	});

describe('useTimelineLayout layoutMap', () => {
	test('produces, for each loaded group, the same layout as a fresh justified layout', () => {
		const groups = [group('2026-03-14', [1.5, 0.67, 1]), group('2026-03-15', [1.78, 2.5, 0.67, 1.5])];
		const {result} = render(groups);
		for (const g of groups) {
			expect(result.current.layoutMap.get(g.timeBucket)).toEqual(calculateJustifiedLayout(ratios(g), 1640));
		}
	});

	// Perf contract (PERF-001): a month-load gives loadedGroups a fresh identity, re-running the memo;
	// already-loaded groups must come from cache — asserted by referential identity, not recomputed.
	test('reuses cached layout objects for unchanged groups when a new month is appended', () => {
		const march = [group('2026-03-14', [1.5, 0.67]), group('2026-03-15', [1, 1.78])];
		const {result, rerender} = render(march);
		const before = march.map((g) => result.current.layoutMap.get(g.timeBucket));

		const april = group('2026-04-02', [0.67, 0.67, 1.5]);
		rerender({allBuckets: [], loadedMonths: new Map(), loadedGroups: [...march, april], viewportWidth: 1640});

		march.forEach((g, i) => {
			expect(result.current.layoutMap.get(g.timeBucket)).toBe(before[i]);
		});
		expect(result.current.layoutMap.get('2026-04-02')).toEqual(calculateJustifiedLayout(ratios(april), 1640));
	});

	test('recomputes a group when viewportWidth changes', () => {
		const g = group('2026-03-14', [1.5, 0.67, 1]);
		const {result, rerender} = render([g], 1640);
		const before = result.current.layoutMap.get('2026-03-14');

		rerender({allBuckets: [], loadedMonths: new Map(), loadedGroups: [g], viewportWidth: 1200});
		const after = result.current.layoutMap.get('2026-03-14');

		expect(after).not.toBe(before);
		expect(after).toEqual(calculateJustifiedLayout(ratios(g), 1200));
	});

	// Two accounts can share a calendar day with different photos; keying on DayGroup identity (distinct
	// objects), not the 'YYYY-MM-DD' string, keeps their layouts from colliding.
	test('does not collide two distinct groups that share a timeBucket string', () => {
		const accountA = group('2026-03-14', [1.5, 1.5, 1.5]);
		const {result, rerender} = render([accountA]);
		expect(result.current.layoutMap.get('2026-03-14')).toEqual(calculateJustifiedLayout(ratios(accountA), 1640));

		const accountB = group('2026-03-14', [0.67, 0.67]);
		rerender({allBuckets: [], loadedMonths: new Map(), loadedGroups: [accountB], viewportWidth: 1640});
		expect(result.current.layoutMap.get('2026-03-14')).toEqual(calculateJustifiedLayout(ratios(accountB), 1640));
	});
});
