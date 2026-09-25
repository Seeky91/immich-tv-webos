import {renderHook} from '@testing-library/react';
import type {TimelineAsset} from '../domain/types';
import {useViewerPosition} from './useViewerPosition';

const asset = (id: string, localDateTime: string): TimelineAsset => ({id, type: 'IMAGE', ratio: 1, localDateTime, durationSeconds: null});

describe('useViewerPosition', () => {
	test('in-memory list: rank within the list', () => {
		const assets = [asset('a', '2026-07-01T00:00:00Z'), asset('b', '2026-07-01T00:00:00Z')];
		const {result} = renderHook(() => useViewerPosition(undefined, assets, 1));
		expect(result.current).toBe('2 / 2');
	});

	test('timeline: counts unloaded months from bucket counts', () => {
		const may = [asset('m1', '2026-05-03T00:00:00Z'), asset('m2', '2026-05-02T00:00:00Z')];
		const timeline = {
			allBuckets: [
				{timeBucket: '2026-07-01', count: 1200},
				{timeBucket: '2026-06-01', count: 300},
				{timeBucket: '2026-05-01', count: 2},
			],
			loadedMonths: new Map([['2026-05-01', [{timeBucket: '2026-05-03', assets: may, count: 2}]]]),
		};
		const {result} = renderHook(() => useViewerPosition(timeline, may, 1));
		expect(result.current).toBe('1,502 / 1,502');
	});
});
