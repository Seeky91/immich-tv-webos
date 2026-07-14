import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor} from '@testing-library/react';
import {APIError} from '../api/client';
import {RepositoryProvider} from '../domain/RepositoryContext';
import type {PhotoRepository} from '../domain/PhotoRepository';
import type {TimelineAsset} from '../domain/types';
import {useTimeline} from './useAssets';

const asset = (id: string, localDateTime: string): TimelineAsset => ({id, type: 'IMAGE', ratio: 1, localDateTime, durationSeconds: null});

function makeRepository(overrides: Partial<PhotoRepository> = {}): PhotoRepository {
	return {
		getBuckets: jest.fn().mockResolvedValue([
			{timeBucket: '2026-07-01', count: 2},
			{timeBucket: '2026-06-01', count: 1},
		]),
		getBucketAssets: jest.fn().mockImplementation((timeBucket: string) =>
			Promise.resolve([asset(`${timeBucket}-1`, `${timeBucket.slice(0, 8)}14T10:00:00.000Z`)])
		),
		...overrides,
	} as unknown as PhotoRepository;
}

function wrapperFor(repository: PhotoRepository) {
	const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
	const Wrapper = ({children}: {children: React.ReactNode}) => (
		<QueryClientProvider client={queryClient}>
			<RepositoryProvider repository={repository}>{children}</RepositoryProvider>
		</QueryClientProvider>
	);
	return Wrapper;
}

describe('useTimeline', () => {
	test('loads the bucket index, then months on demand, grouped by day', async () => {
		const repository = makeRepository();
		const {result} = renderHook(() => useTimeline(), {wrapper: wrapperFor(repository)});

		await waitFor(() => expect(result.current.allBuckets).toHaveLength(2));
		expect(result.current.loadedMonths.size).toBe(0);

		act(() => result.current.requestMonths(['2026-07-01']));
		await waitFor(() => expect(result.current.loadedMonths.has('2026-07-01')).toBe(true));

		expect(repository.getBucketAssets).toHaveBeenCalledTimes(1);
		expect(result.current.loadedMonths.get('2026-07-01')?.[0]?.timeBucket).toBe('2026-07-14');
	});

	test('never refetches a loaded or in-flight month', async () => {
		const repository = makeRepository();
		const {result} = renderHook(() => useTimeline(), {wrapper: wrapperFor(repository)});
		await waitFor(() => expect(result.current.allBuckets).toHaveLength(2));

		act(() => {
			result.current.requestMonths(['2026-07-01']);
			result.current.requestMonths(['2026-07-01']);
		});
		await waitFor(() => expect(result.current.loadedMonths.has('2026-07-01')).toBe(true));
		act(() => result.current.requestMonths(['2026-07-01']));

		expect(repository.getBucketAssets).toHaveBeenCalledTimes(1);
	});

	test('marks failed months, skips them on passive requests, retries on retryFailed', async () => {
		// 401 so the shared retry config fails immediately instead of retrying twice
		const getBucketAssets = jest
			.fn()
			.mockRejectedValueOnce(new APIError('Unauthorized', 401))
			.mockResolvedValue([asset('ok', '2026-07-14T10:00:00.000Z')]);
		const repository = makeRepository({getBucketAssets});
		const {result} = renderHook(() => useTimeline(), {wrapper: wrapperFor(repository)});
		await waitFor(() => expect(result.current.allBuckets).toHaveLength(2));

		act(() => result.current.requestMonths(['2026-07-01']));
		await waitFor(() => expect(result.current.failedMonths.has('2026-07-01')).toBe(true));

		act(() => result.current.requestMonths(['2026-07-01']));
		expect(getBucketAssets).toHaveBeenCalledTimes(1);

		act(() => result.current.requestMonths(['2026-07-01'], {retryFailed: true}));
		await waitFor(() => expect(result.current.loadedMonths.has('2026-07-01')).toBe(true));
		expect(result.current.failedMonths.size).toBe(0);
	});
});
