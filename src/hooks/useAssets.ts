import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {ImmichAPI} from '../api/immich';
import {ASSETS_QUERY_CONFIG, BUCKETS_PER_PAGE} from './queryConfig';
import {isAPIError} from '../utils/typeGuards';
import type {BucketMetadata} from '../api/types';

export const useAssets = (api: ImmichAPI | null) => {
	return useQuery({
		queryKey: ['assets'],
		queryFn: async () => {
			if (!api) throw new Error('API client not available');
			return api.getAssets({take: 500});
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

export const useBuckets = (api: ImmichAPI | null) => {
	return useQuery({
		queryKey: ['timeline-buckets'],
		queryFn: async () => {
			if (!api) throw new Error('API client not available');
			return api.getBuckets();
		},
		enabled: !!api,
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: (failureCount: number, error: unknown) => {
			if (isAPIError(error) && error.status === 401) return false;
			return failureCount < 2;
		},
	});
};

export const useInfiniteGroupedAssets = (api: ImmichAPI | null) => {
	const {data: allBuckets, isLoading: isBucketsLoading} = useBuckets(api);

	const infiniteQuery = useInfiniteQuery({
		queryKey: ['infinite-grouped-assets'],
		queryFn: async ({pageParam = 0}) => {
			if (!api) throw new Error('API client not available');
			if (!allBuckets) throw new Error('Buckets not loaded');

			return api.getGroupedAssetsPageWithBuckets(allBuckets, {skip: pageParam, take: BUCKETS_PER_PAGE});
		},
		enabled: !!api && !!allBuckets && !isBucketsLoading,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
		...ASSETS_QUERY_CONFIG,
	});

	const metadataMap = useMemo(() => {
		const map = new Map<string, BucketMetadata>();
		infiniteQuery.data?.pages.forEach((page) => {
			page.metadataMap.forEach((meta, key) => map.set(key, meta));
		});
		return map;
	}, [infiniteQuery.data?.pages]);

	return {
		...infiniteQuery,
		isLoading: isBucketsLoading || infiniteQuery.isLoading,
		allBuckets: allBuckets || [],
		totalBucketCount: allBuckets?.length || 0,
		metadataMap,
	};
};
