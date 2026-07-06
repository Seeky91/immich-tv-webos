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
			{id: 'a1', type: 'IMAGE', ratio: 2, fileCreatedAt: '2025-09-19T11:18:30.838Z', durationSeconds: null},
			{id: 'a2', type: 'VIDEO', ratio: 0.5, fileCreatedAt: '2025-09-19T11:20:00.000Z', durationSeconds: 4},
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
