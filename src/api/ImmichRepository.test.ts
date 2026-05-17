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
