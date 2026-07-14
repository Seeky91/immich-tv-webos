import {APIClient} from './client';
import {ImmichRepository} from './ImmichRepository';
import {AuthMethod, type ApiKeyConfig, type UserCredentialsConfig} from './types';

const apiKeyConfig: ApiKeyConfig = {
	method: AuthMethod.API_KEY,
	baseUrl: 'https://immich.example.com',
	apiKey: 'test-api-key',
};

const userCredentialsConfig: UserCredentialsConfig = {
	method: AuthMethod.USER_CREDENTIALS,
	baseUrl: 'https://immich.example.com',
	email: 'u@example.com',
	accessToken: 'test-session-token',
};

const repoWithFetch = (fetch: jest.Mock) => new ImmichRepository({fetch} as unknown as APIClient);

describe('ImmichRepository timeline endpoints', () => {
	test('getBuckets requests the main timeline with explicit visibility filters', async () => {
		const fetch = jest.fn().mockResolvedValue([{timeBucket: '2026-03-01', count: 2}]);
		const buckets = await repoWithFetch(fetch).getBuckets();
		// Without visibility=timeline the server defaults to ('archive','timeline') and
		// archived assets leak into the TV timeline.
		expect(fetch).toHaveBeenCalledWith('/timeline/buckets?visibility=timeline&withPartners=true&withStacked=true');
		expect(buckets).toEqual([{timeBucket: '2026-03-01', count: 2}]);
	});

	test('getBucketAssets fetches one month with the same filters and forwards the abort signal', async () => {
		const fetch = jest.fn().mockResolvedValue({
			id: ['march'],
			isImage: [true],
			ratio: [1.5],
			fileCreatedAt: ['2026-03-14T10:00:00.000Z'],
			duration: [null],
		});
		const controller = new AbortController();

		const assets = await repoWithFetch(fetch).getBucketAssets('2026-03-01', controller.signal);

		expect(fetch).toHaveBeenCalledWith('/timeline/bucket?timeBucket=2026-03-01&visibility=timeline&withPartners=true&withStacked=true', {
			signal: controller.signal,
		});
		expect(assets).toEqual([
			{id: 'march', type: 'IMAGE', ratio: 1.5, localDateTime: '2026-03-14T10:00:00.000Z', durationSeconds: null},
		]);
	});

	test('getBucketAssets reconstructs localDateTime from localOffsetHours', async () => {
		const fetch = jest.fn().mockResolvedValue({
			id: ['night-shot'],
			isImage: [true],
			ratio: [1],
			// Taken 2026-03-01 00:30 local (UTC+1) = 2026-02-28 23:30 UTC: the server puts it in
			// the March bucket, so day grouping must land on March 1st too.
			fileCreatedAt: ['2026-02-28T23:30:00.000Z'],
			localOffsetHours: [1],
			duration: [null],
		});

		const assets = await repoWithFetch(fetch).getBucketAssets('2026-03-01');

		expect(assets[0]?.localDateTime).toBe('2026-03-01T00:30:00.000Z');
	});

	test('getBucketAssets falls back to a localDateTime column on older servers', async () => {
		const fetch = jest.fn().mockResolvedValue({
			id: ['legacy'],
			isImage: [false],
			ratio: [1.78],
			fileCreatedAt: ['2026-02-28T23:30:00.000Z'],
			localDateTime: ['2026-03-01T00:30:00.000Z'],
			duration: [4000],
		});

		const assets = await repoWithFetch(fetch).getBucketAssets('2026-03-01');

		expect(assets[0]).toEqual({id: 'legacy', type: 'VIDEO', ratio: 1.78, localDateTime: '2026-03-01T00:30:00.000Z', durationSeconds: 4});
	});
});

describe('ImmichRepository.getPlaces', () => {
	test('maps /search/cities assets to places sorted by city name', async () => {
		const fetch = jest.fn().mockResolvedValue([
			{id: 'asset-paris', exifInfo: {city: 'Paris', country: 'France'}},
			{id: 'asset-aegina', exifInfo: {city: 'Aegina', country: 'Greece'}},
			{id: 'asset-no-city', exifInfo: {}},
		]);
		const places = await repoWithFetch(fetch).getPlaces();
		expect(fetch).toHaveBeenCalledWith('/search/cities');
		expect(places).toEqual([
			{city: 'Aegina', country: 'Greece', thumbnailAssetId: 'asset-aegina'},
			{city: 'Paris', country: 'France', thumbnailAssetId: 'asset-paris'},
		]);
	});

	test('returns empty list on non-array response', async () => {
		const fetch = jest.fn().mockResolvedValue({error: 'unexpected'});
		await expect(repoWithFetch(fetch).getPlaces()).resolves.toEqual([]);
	});
});

describe('ImmichRepository.searchByCity', () => {
	test('POSTs a city metadata search and maps items to timeline assets', async () => {
		const fetch = jest.fn().mockResolvedValue({
			assets: {
				items: [
					{id: 'a1', type: 'IMAGE', fileCreatedAt: '2025-09-19T11:18:30.838Z', duration: null, width: 200, height: 100},
					{id: 'a2', type: 'VIDEO', fileCreatedAt: '2025-09-19T11:20:00.000Z', duration: 4000, exifInfo: {exifImageWidth: 100, exifImageHeight: 200}},
					{id: 'a3', type: 'VIDEO', fileCreatedAt: '2025-09-19T11:21:00.000Z', duration: 2000, visibility: 'hidden'},
				],
			},
		});
		const assets = await repoWithFetch(fetch).searchByCity('Paris');
		expect(fetch).toHaveBeenCalledWith('/search/metadata', {
			method: 'POST',
			body: JSON.stringify({city: 'Paris', size: 500}),
		});
		expect(assets).toEqual([
			{id: 'a1', type: 'IMAGE', ratio: 2, localDateTime: '2025-09-19T11:18:30.838Z', durationSeconds: null},
			{id: 'a2', type: 'VIDEO', ratio: 0.5, localDateTime: '2025-09-19T11:20:00.000Z', durationSeconds: 4},
		]);
	});
});

describe('ImmichRepository.videoPlaybackUrl', () => {
	test('returns Immich /video/playback URL with apiKey query param (API_KEY auth)', () => {
		const repo = new ImmichRepository(new APIClient(apiKeyConfig));
		expect(repo.videoPlaybackUrl('asset-id-42')).toBe(
			'https://immich.example.com/api/assets/asset-id-42/video/playback?apiKey=test-api-key',
		);
	});

	test('returns Immich /video/playback URL with sessionKey query param (USER_CREDENTIALS auth)', () => {
		const repo = new ImmichRepository(new APIClient(userCredentialsConfig));
		expect(repo.videoPlaybackUrl('asset-id-42')).toBe(
			'https://immich.example.com/api/assets/asset-id-42/video/playback?sessionKey=test-session-token',
		);
	});
});
