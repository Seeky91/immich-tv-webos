import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {ImmichAPI} from '../api/immich';
import {isAPIError} from '../utils/typeGuards';

export const useAssets = (api: ImmichAPI | null) => {
	return useQuery({
		queryKey: ['assets'],
		queryFn: async () => {
			if (!api) throw new Error('API client not available');
			return api.getAssets({take: 500}); // Fetch 500 assets initially
		},
		enabled: !!api,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: (failureCount, error) => {
			// Don't retry on 401 (auth error)
			if (isAPIError(error) && error.status === 401) return false;
			return failureCount < 2;
		},
	});
};

export const useGroupedAssets = (api: ImmichAPI | null) => {
	return useQuery({
		queryKey: ['grouped-assets'],
		queryFn: async () => {
			if (!api) throw new Error('API client not available');
			return api.getGroupedAssets({take: 500});
		},
		enabled: !!api,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: (failureCount, error) => {
			// Don't retry on 401 (auth error)
			if (isAPIError(error) && error.status === 401) return false;
			return failureCount < 2;
		},
	});
};

export const useInfiniteGroupedAssets = (api: ImmichAPI | null) => {
	return useInfiniteQuery({
		queryKey: ['infinite-grouped-assets'],
		queryFn: async ({pageParam = 0}) => {
			if (!api) throw new Error('API client not available');
			return api.getGroupedAssetsPage({skip: pageParam, take: 2});
		},
		enabled: !!api,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchOnWindowFocus: false,
		retry: (failureCount, error) => {
			// Don't retry on 401 (auth error)
			if (isAPIError(error) && error.status === 401) return false;
			return failureCount < 2;
		},
	});
};
