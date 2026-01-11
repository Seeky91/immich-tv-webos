import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {ImmichAPI} from '../api/immich';
import {ASSETS_QUERY_CONFIG, BUCKETS_PER_PAGE} from './queryConfig';

export const useAssets = (api: ImmichAPI | null) => {
	return useQuery({
		queryKey: ['assets'],
		queryFn: async () => {
			if (!api) throw new Error('API client not available');
			return api.getAssets({take: 500}); // Fetch 500 assets initially
		},
		enabled: !!api,
		...ASSETS_QUERY_CONFIG,
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
		...ASSETS_QUERY_CONFIG,
	});
};

export const useInfiniteGroupedAssets = (api: ImmichAPI | null) => {
	return useInfiniteQuery({
		queryKey: ['infinite-grouped-assets'],
		queryFn: async ({pageParam = 0}) => {
			if (!api) throw new Error('API client not available');
			return api.getGroupedAssetsPage({skip: pageParam, take: BUCKETS_PER_PAGE});
		},
		enabled: !!api,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
		...ASSETS_QUERY_CONFIG,
	});
};
