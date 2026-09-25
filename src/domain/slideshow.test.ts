import {createSlideshowPlaylist, SlideshowPlaylist} from './slideshow';
import type {PhotoRepository} from './PhotoRepository';
import type {TimelineAsset} from './types';

const image = (id: string, localDateTime = '2026-07-14T10:00:00.000Z'): TimelineAsset => ({id, type: 'IMAGE', ratio: 1, localDateTime, durationSeconds: null});
const video = (id: string): TimelineAsset => ({...image(id), type: 'VIDEO', durationSeconds: 3});

const repository = {searchRandomImages: jest.fn()} as unknown as PhotoRepository;

async function drain(playlist: SlideshowPlaylist, count: number): Promise<(string | undefined)[]> {
	const ids = [];
	for (let i = 0; i < count; i++) ids.push((await playlist.next())?.id);
	return ids;
}

describe('SlideshowPlaylist', () => {
	test('skips videos, then walks back and forth through its history', async () => {
		const playlist = new SlideshowPlaylist(jest.fn().mockResolvedValueOnce([image('a'), video('v'), image('b')]).mockResolvedValue(null));
		expect(await drain(playlist, 2)).toEqual(['a', 'b']);
		expect(playlist.previous()?.id).toBe('a');
		expect(playlist.previous()).toBeNull();
		expect((await playlist.next())?.id).toBe('b');
		expect(await playlist.next()).toBeNull();
	});

	test('peek resolves the upcoming asset once without advancing', async () => {
		const pull = jest.fn().mockResolvedValue([image('a'), image('b')]);
		const playlist = new SlideshowPlaylist(pull);
		const [first, second] = await Promise.all([playlist.peek(), playlist.peek()]);
		expect(first?.id).toBe('a');
		expect(second?.id).toBe('a');
		expect(playlist.current()).toBeNull();
		expect((await playlist.next())?.id).toBe('a');
		expect(pull).toHaveBeenCalledTimes(1);
	});
});

describe('createSlideshowPlaylist', () => {
	test('in-memory list: starts on the viewed photo, continues after it, then loops', async () => {
		const assets = [image('a'), image('b'), image('c')];
		const playlist = createSlideshowPlaylist({order: 'sequential', start: assets[1]!, repository, assets});
		expect(await drain(playlist, 5)).toEqual(['b', 'c', 'a', 'b', 'c']);
	});

	test('in-memory list without images ends immediately', async () => {
		const playlist = createSlideshowPlaylist({order: 'shuffle', start: null, repository, assets: [video('v')]});
		expect(await playlist.next()).toBeNull();
	});

	test('timeline: walks months from the start photo and wraps around', async () => {
		const months: Record<string, TimelineAsset[]> = {
			'2026-07-01': [image('j1', '2026-07-20T10:00:00.000Z'), image('j2', '2026-07-02T10:00:00.000Z')],
			'2026-06-01': [video('clip')],
			'2026-05-01': [image('m1', '2026-05-03T10:00:00.000Z')],
		};
		const fetchMonth = jest.fn((timeBucket: string) => Promise.resolve([{timeBucket, assets: months[timeBucket]!, count: 1}]));
		const allBuckets = Object.keys(months).map((timeBucket) => ({timeBucket, count: 1}));
		const playlist = createSlideshowPlaylist({
			order: 'sequential',
			start: months['2026-07-01']![0]!,
			repository,
			timeline: {scope: {}, allBuckets, fetchMonth},
			assets: [],
		});
		expect(await drain(playlist, 4)).toEqual(['j1', 'j2', 'm1', 'j1']);
	});

	test('timeline of videos only ends after one full lap', async () => {
		const fetchMonth = jest.fn(() => Promise.resolve([{timeBucket: '2026-07-01', assets: [video('v')], count: 1}]));
		const playlist = createSlideshowPlaylist({
			order: 'sequential',
			start: null,
			repository,
			timeline: {scope: {}, allBuckets: [{timeBucket: '2026-07-01', count: 1}], fetchMonth},
			assets: [],
		});
		expect(await playlist.next()).toBeNull();
	});

	test('timeline shuffle draws random images from the server within the scope', async () => {
		const searchRandomImages = jest.fn().mockResolvedValueOnce([image('r1'), image('r2')]).mockResolvedValue([]);
		const playlist = createSlideshowPlaylist({
			order: 'shuffle',
			start: image('viewed'),
			repository: {searchRandomImages} as unknown as PhotoRepository,
			timeline: {scope: {albumId: 'al1'}, allBuckets: [], fetchMonth: jest.fn()},
			assets: [],
		});
		expect(await drain(playlist, 4)).toEqual(['viewed', 'r1', 'r2', undefined]);
		expect(searchRandomImages).toHaveBeenCalledWith({albumId: 'al1'}, 50);
	});
});
