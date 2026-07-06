import {formatDuration, toDurationSeconds} from './FormattingService';

describe('toDurationSeconds', () => {
	it('parses legacy "H:MM:SS.mmm" strings (Immich < v2)', () => {
		expect(toDurationSeconds('0:01:46.786')).toBeCloseTo(106.786);
		expect(toDurationSeconds('1:02:03.000')).toBeCloseTo(3723);
	});

	it('converts millisecond numbers (Immich v2+)', () => {
		expect(toDurationSeconds(106786)).toBeCloseTo(106.786);
		expect(toDurationSeconds(0)).toBe(0);
	});

	it('returns null for null, undefined and malformed strings', () => {
		expect(toDurationSeconds(null)).toBeNull();
		expect(toDurationSeconds(undefined)).toBeNull();
		expect(toDurationSeconds('not-a-duration')).toBeNull();
	});
});

describe('formatDuration', () => {
	it('formats sub-hour durations as M:SS', () => {
		expect(formatDuration(106.786)).toBe('1:46');
		expect(formatDuration(9)).toBe('0:09');
	});

	it('formats hour-plus durations as H:MM:SS', () => {
		expect(formatDuration(3723)).toBe('1:02:03');
	});
});
