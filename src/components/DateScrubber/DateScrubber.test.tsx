import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import type {TimelineBucket} from '../../domain/types';
import {bucketIndexAtPercent, buildScrubberMarkers, DateScrubber} from './DateScrubber';

const buckets: TimelineBucket[] = [
	{timeBucket: '2026-07-01', count: 10},
	{timeBucket: '2026-06-01', count: 30},
	{timeBucket: '2025-12-01', count: 20},
];

describe('DateScrubber', () => {
	test('maps rail positions using the proportional bucket heights', () => {
		expect(bucketIndexAtPercent([100, 300, 100], 0.1)).toBe(0);
		expect(bucketIndexAtPercent([100, 300, 100], 0.5)).toBe(1);
		expect(bucketIndexAtPercent([100, 300, 100], 0.95)).toBe(2);
	});

	test('places month markers proportionally and labels year boundaries', () => {
		const markers = buildScrubberMarkers(buckets, [100, 300, 100]);
		expect(markers[0]?.topPercent).toBeCloseTo(12.4);
		expect(markers[1]?.topPercent).toBeCloseTo(50);
		expect(markers[2]?.topPercent).toBeCloseTo(87.6);
		expect(markers.map((marker) => marker.showYear)).toEqual([true, false, true]);
	});

	test('uses Up and Down to select a month, Enter to jump, and Left to exit', () => {
		const onJump = jest.fn();
		const onExit = jest.fn();
		render(
			<DateScrubber
				buckets={buckets}
				bucketHeights={[100, 300, 100]}
				activeIndex={0}
				isLoading={false}
				hasError={false}
				onJump={onJump}
				onExit={onExit}
			/>
		);

		const scrubber = screen.getByRole('scrollbar');
		fireEvent.focus(scrubber);
		fireEvent.keyDown(scrubber, {key: 'ArrowDown', keyCode: 40});
		expect(scrubber.getAttribute('aria-valuetext')).toBe('Jun 2026');
		fireEvent.keyDown(scrubber, {key: 'Enter', keyCode: 13});
		expect(onJump).toHaveBeenCalledWith('2026-06-01');
		fireEvent.keyDown(scrubber, {key: 'ArrowLeft', keyCode: 37});
		expect(onExit).toHaveBeenCalledTimes(1);
	});
});
