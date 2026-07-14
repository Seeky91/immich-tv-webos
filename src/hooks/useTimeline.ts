import {useCallback, useMemo, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {ASSETS_QUERY_CONFIG, useRepositoryQuery} from './queryConfig';
import {useRepository} from '../domain/RepositoryContext';
import {groupAssetsByDay} from '../domain/transforms';
import type {PhotoRepository} from '../domain/PhotoRepository';
import type {DayGroup} from '../domain/types';

const useBuckets = () =>
	useRepositoryQuery(['timeline-buckets'], (r) => r.getBuckets(), {staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000});

export interface RequestMonthsOptions {
	// Clears failed months first so an explicit user action (scrubber jump) retries them,
	// while passive scrolling doesn't hammer a broken server.
	retryFailed?: boolean;
}

// Mutable request-tracking mirrors, replaced wholesale on account switch so completions
// belonging to a previous repository can be discarded by identity.
interface MonthMirrors {
	repository: PhotoRepository;
	loaded: Map<string, DayGroup[]>;
	failed: Set<string>;
	pending: Set<string>;
}

const NO_LOADED_MONTHS: ReadonlyMap<string, DayGroup[]> = new Map();
const NO_FAILED_MONTHS: ReadonlySet<string> = new Set();

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

	// Month state is tagged with its owning repository and derives as empty after an account
	// switch — no reset effect (react-hooks/set-state-in-effect, Enact CI strict), and a late
	// completion from the previous account tags itself with the old repository, so it can
	// never surface under the new one.
	const [loadedState, setLoadedState] = useState<{repository: PhotoRepository; months: ReadonlyMap<string, DayGroup[]>} | null>(null);
	const [failedState, setFailedState] = useState<{repository: PhotoRepository; months: ReadonlySet<string>} | null>(null);
	const loadedMonths = loadedState && loadedState.repository === repository ? loadedState.months : NO_LOADED_MONTHS;
	const failedMonths = failedState && failedState.repository === repository ? failedState.months : NO_FAILED_MONTHS;
	const mirrorsRef = useRef<MonthMirrors | null>(null);

	const requestMonths = useCallback(
		(timeBuckets: string[], {retryFailed = false}: RequestMonthsOptions = {}) => {
			if (!mirrorsRef.current || mirrorsRef.current.repository !== repository) {
				mirrorsRef.current = {repository, loaded: new Map(), failed: new Set(), pending: new Set()};
			}
			const mirrors = mirrorsRef.current;
			if (retryFailed && mirrors.failed.size > 0) {
				mirrors.failed = new Set();
				setFailedState({repository, months: new Set()});
			}
			for (const timeBucket of timeBuckets) {
				if (mirrors.loaded.has(timeBucket) || mirrors.pending.has(timeBucket) || mirrors.failed.has(timeBucket)) {
					continue;
				}
				mirrors.pending.add(timeBucket);
				queryClient
					.fetchQuery({
						queryKey: ['timeline-bucket', timeBucket],
						queryFn: ({signal}) => repository.getBucketAssets(timeBucket, signal).then((assets) => groupAssetsByDay(assets)),
						staleTime: Infinity,
						gcTime: Infinity,
						retry: ASSETS_QUERY_CONFIG.retry,
					})
					.then((dayGroups) => {
						if (mirrorsRef.current !== mirrors) return;
						mirrors.loaded.set(timeBucket, dayGroups);
						setLoadedState({repository, months: new Map(mirrors.loaded)});
					})
					.catch(() => {
						if (mirrorsRef.current !== mirrors) return;
						mirrors.failed.add(timeBucket);
						setFailedState({repository, months: new Set(mirrors.failed)});
					})
					.then(() => mirrors.pending.delete(timeBucket));
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
