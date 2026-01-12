import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {ImmichAPI} from '../api/immich';
import {ASSETS_QUERY_CONFIG, BUCKETS_PER_PAGE} from './queryConfig';
import {isAPIError} from '../utils/typeGuards';
import type {BucketMetadata, TimelineBucket} from '../api/types';

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

export const useBuckets = (api: ImmichAPI | null) => {
	return useQuery({
		queryKey: ['timeline-buckets'],
		queryFn: async () => {
			if (!api) throw new Error('API client not available');
			return api.getBuckets();
		},
		enabled: !!api,
		staleTime: 10 * 60 * 1000, // 10 minutes (longer than assets)
		gcTime: 30 * 60 * 1000, // 30 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: (failureCount: number, error: unknown) => {
			if (isAPIError(error) && error.status === 401) return false;
			return failureCount < 2;
		},
	});
};

export const useBucketMetadataMap = (api: ImmichAPI | null, allBuckets: TimelineBucket[]) => {
	return useQuery({
		queryKey: ['bucket-metadata-map', allBuckets.length],
		queryFn: async () => {
			if (!api || !allBuckets.length) return new Map<string, BucketMetadata>();

			const BATCH_SIZE = 10;
			const metadataMap = new Map<string, BucketMetadata>();

			for (let i = 0; i < allBuckets.length; i += BATCH_SIZE) {
				const batch = allBuckets.slice(i, i + BATCH_SIZE);
				const results = await Promise.all(
					batch.map(async (bucket) => {
						try {
							const metadata = await api.getBucketMetadata(bucket.timeBucket);
							return {
								date: bucket.timeBucket,
								...metadata,
								count: bucket.count,
							};
						} catch (error) {
							console.error(`Failed to fetch metadata for ${bucket.timeBucket}:`, error);
							return {
								date: bucket.timeBucket,
								ids: Array(bucket.count).fill(''),
								ratios: Array(bucket.count).fill(1),
								count: bucket.count,
							};
						}
					})
				);

				results.forEach((meta) => metadataMap.set(meta.date, meta));
			}

			return metadataMap;
		},
		enabled: !!api && allBuckets.length > 0,
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
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

	return {
		...infiniteQuery,
		isLoading: isBucketsLoading || infiniteQuery.isLoading,
		allBuckets: allBuckets || [],
		totalBucketCount: allBuckets?.length || 0,
	};
};
