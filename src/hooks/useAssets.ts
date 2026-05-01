import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {ASSETS_QUERY_CONFIG, BUCKETS_PER_PAGE} from './queryConfig';
import {isAPIError} from '../utils/typeGuards';
import {useRepository} from '../domain/RepositoryContext';

export const useBuckets = () => {
	const repository = useRepository();
	return useQuery({
		queryKey: ['timeline-buckets'],
		queryFn: () => repository.getBuckets(),
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

export const useInfiniteTimeline = () => {
	const repository = useRepository();
	const {data: allBuckets, isLoading: isBucketsLoading} = useBuckets();

	const infiniteQuery = useInfiniteQuery({
		queryKey: ['infinite-timeline'],
		queryFn: async ({pageParam = 0}) => {
			if (!allBuckets) throw new Error('Buckets not loaded');
			return repository.getTimelinePage(allBuckets, pageParam, BUCKETS_PER_PAGE);
		},
		enabled: !!allBuckets && !isBucketsLoading,
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
