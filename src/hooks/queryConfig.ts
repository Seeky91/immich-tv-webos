import {useQuery, type QueryKey, type UseQueryOptions, type UseQueryResult} from '@tanstack/react-query';
import {APIError} from '../api/client';
import {useRepository} from '../domain/RepositoryContext';
import type {PhotoRepository} from '../domain/PhotoRepository';

/**
 * Shared TanStack Query configuration for asset-related queries.
 * Provides consistent caching, stale time, and retry behavior.
 */
export const ASSETS_QUERY_CONFIG = {
	staleTime: 5 * 60 * 1000, // 5 minutes
	gcTime: 10 * 60 * 1000, // 10 minutes
	refetchOnWindowFocus: false,
	refetchOnMount: false,
	retry: (failureCount: number, error: unknown) => {
		// Don't retry on 401 (auth error)
		if (error instanceof APIError && error.status === 401) return false;
		return failureCount < 2;
	},
};

/**
 * Number of timeline buckets to fetch per page in infinite scroll.
 * Each bucket represents one day of photos/videos.
 */
export const BUCKETS_PER_PAGE = 3;

export function useRepositoryQuery<T>(
	queryKey: QueryKey,
	fetcher: (r: PhotoRepository) => Promise<T>,
	options?: Partial<Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>>,
): UseQueryResult<T> {
	const repository = useRepository();
	return useQuery({
		queryKey,
		queryFn: () => fetcher(repository),
		...ASSETS_QUERY_CONFIG,
		...options,
	});
}
