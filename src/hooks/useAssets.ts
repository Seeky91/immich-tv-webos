import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {ASSETS_QUERY_CONFIG, useRepositoryQuery} from './queryConfig';
import {useRepository} from '../domain/RepositoryContext';
import {groupAssetsByDay} from '../domain/transforms';
import type {DayGroup} from '../domain/types';

const useBuckets = () =>
	useRepositoryQuery(['timeline-buckets'], (r) => r.getBuckets(), {staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000});

export interface RequestMonthsOptions {
	// Clears failed months first so an explicit user action (scrubber jump) retries them,
	// while passive scrolling doesn't hammer a broken server.
	retryFailed?: boolean;
}

/**
 * Timeline data mirroring the Immich web client's TimelineManager: the bucket index gives a
 * full-month skeleton up front, then each month loads independently — on demand, in parallel,
 * cached for the session — instead of paginating a contiguous window. Jumping anywhere is then
 * just a scroll; already-visited months never refetch.
 */
export const useTimeline = () => {
	const repository = useRepository();
	const queryClient = useQueryClient();
	const {data: allBuckets, isLoading, isError, error} = useBuckets();
	const buckets = useMemo(() => allBuckets ?? [], [allBuckets]);

	const [loadedMonths, setLoadedMonths] = useState<ReadonlyMap<string, DayGroup[]>>(new Map());
	const [failedMonths, setFailedMonths] = useState<ReadonlySet<string>>(new Set());
	const loadedRef = useRef<Map<string, DayGroup[]>>(new Map());
	const failedRef = useRef<Set<string>>(new Set());
	const pendingRef = useRef<Set<string>>(new Set());

	// Account switch: drop the per-instance mirrors so months from the previous repository
	// can't bleed into the new one (in-flight loads are discarded via the instance check below).
	useEffect(() => {
		loadedRef.current = new Map();
		failedRef.current = new Set();
		pendingRef.current = new Set();
		setLoadedMonths(new Map());
		setFailedMonths(new Set());
	}, [repository]);

	const requestMonths = useCallback(
		(timeBuckets: string[], {retryFailed = false}: RequestMonthsOptions = {}) => {
			if (retryFailed && failedRef.current.size > 0) {
				failedRef.current = new Set();
				setFailedMonths(new Set());
			}
			const loadedAtRequest = loadedRef.current;
			for (const timeBucket of timeBuckets) {
				if (loadedAtRequest.has(timeBucket) || pendingRef.current.has(timeBucket) || failedRef.current.has(timeBucket)) {
					continue;
				}
				pendingRef.current.add(timeBucket);
				queryClient
					.fetchQuery({
						queryKey: ['timeline-bucket', timeBucket],
						queryFn: ({signal}) => repository.getBucketAssets(timeBucket, signal).then((assets) => groupAssetsByDay(assets)),
						staleTime: Infinity,
						gcTime: Infinity,
						retry: ASSETS_QUERY_CONFIG.retry,
					})
					.then((dayGroups) => {
						if (loadedRef.current !== loadedAtRequest) return;
						loadedAtRequest.set(timeBucket, dayGroups);
						setLoadedMonths(new Map(loadedAtRequest));
					})
					.catch(() => {
						if (loadedRef.current !== loadedAtRequest) return;
						failedRef.current.add(timeBucket);
						setFailedMonths(new Set(failedRef.current));
					})
					.then(() => pendingRef.current.delete(timeBucket));
			}
		},
		[queryClient, repository]
	);

	return {
		allBuckets: buckets,
		isLoading,
		isError,
		error,
		loadedMonths,
		failedMonths,
		requestMonths,
	};
};
