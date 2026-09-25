import {getRotation, resetRotationCacheForTests, rotateClockwise} from './rotationStore';

describe('rotationStore', () => {
	beforeEach(() => {
		localStorage.clear();
		resetRotationCacheForTests();
	});

	test('cycles clockwise by quarter turns and persists across reloads', () => {
		expect(rotateClockwise('a')).toBe(90);
		expect(rotateClockwise('a')).toBe(180);
		resetRotationCacheForTests();
		expect(getRotation('a')).toBe(180);
		expect(rotateClockwise('a')).toBe(270);
		expect(rotateClockwise('a')).toBe(0);
		expect(JSON.parse(localStorage.getItem('immich_rotations')!)).toEqual({});
	});

	test('keeps only the most recently rotated assets', () => {
		for (let i = 0; i < 1001; i++) rotateClockwise(`asset-${i}`);
		expect(getRotation('asset-0')).toBe(0);
		expect(getRotation('asset-1000')).toBe(90);
	});
});
