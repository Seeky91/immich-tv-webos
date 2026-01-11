import {isAPIError} from '../utils/typeGuards';

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
		if (isAPIError(error) && error.status === 401) return false;
		return failureCount < 2;
	},
};

/**
 * Number of timeline buckets to fetch per page in infinite scroll.
 * Each bucket represents one day of photos/videos.
 * Reduced from 5 to 3 for more granular loading and better performance.
 */
export const BUCKETS_PER_PAGE = 3;
