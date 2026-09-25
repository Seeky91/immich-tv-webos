import {useCallback, useMemo, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {ASSETS_QUERY_CONFIG, useRepositoryQuery} from './queryConfig';
import {useRepository} from '../domain/RepositoryContext';
import {groupAssetsByDay} from '../domain/transforms';
import type {PhotoRepository} from '../domain/PhotoRepository';
import {MAIN_TIMELINE, type DayGroup, type TimelineScope} from '../domain/types';

const scopeKey = ({albumId, personId, order}: TimelineScope): string =>
	albumId ? `album:${albumId}:${order ?? 'desc'}` : personId ? `person:${personId}` : 'main';

export interface RequestMonthsOptions {
	// Clears failed months first so an explicit user action (scrubber jump) retries them,
	// while passive scrolling doesn't hammer a broken server.
	retryFailed?: boolean;
}

// Mutable request-tracking mirrors, replaced wholesale on account or scope switch so completions
// belonging to a previous one can be discarded by identity.
interface MonthMirrors {
	repository: PhotoRepository;
	scope: string;
	loaded: Map<string, DayGroup[]>;
	failed: Set<string>;
	pending: Set<string>;
}

type OwnedMonths<T> = {repository: PhotoRepository; scope: string; months: T};

const NO_LOADED_MONTHS: ReadonlyMap<string, DayGroup[]> = new Map();
const NO_FAILED_MONTHS: ReadonlySet<string> = new Set();

/**
 * Timeline data mirroring the Immich web client's TimelineManager: the bucket index gives a
 * full-month skeleton up front, then each month loads independently — on demand, in parallel,
 * cached for the session — instead of paginating a contiguous window. Jumping anywhere is then
 * just a scroll; already-visited months never refetch.
 * `null` scope keeps it idle until the caller knows it (e.g. an album's order).
 */
export const useTimeline = (scopeInput: TimelineScope | null = MAIN_TIMELINE) => {
	const repository = useRepository();
	const queryClient = useQueryClient();
	const key = scopeInput ? scopeKey(scopeInput) : '';
	// Callers may pass a fresh-but-equal object each render; identity follows the key.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const scope = useMemo(() => scopeInput, [key]);
	const {data: allBuckets, isLoading, isError, error} = useRepositoryQuery(['timeline-buckets', key], (r) => r.getBuckets(scope!), {
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		enabled: !!scope,
	});
	const buckets = useMemo(() => allBuckets ?? [], [allBuckets]);

	// Month state is tagged with its owning repository + scope and derives as empty after a
	// switch — no reset effect (react-hooks/set-state-in-effect, Enact CI strict), and a late
	// completion from the previous owner tags itself with it, so it can never surface here.
	const [loadedState, setLoadedState] = useState<OwnedMonths<ReadonlyMap<string, DayGroup[]>> | null>(null);
	const [failedState, setFailedState] = useState<OwnedMonths<ReadonlySet<string>> | null>(null);
	const owns = (state: OwnedMonths<unknown> | null) => !!state && state.repository === repository && state.scope === key;
	const loadedMonths = owns(loadedState) ? loadedState!.months : NO_LOADED_MONTHS;
	const failedMonths = owns(failedState) ? failedState!.months : NO_FAILED_MONTHS;
	const mirrorsRef = useRef<MonthMirrors | null>(null);

	const fetchMonth = useCallback(
		(timeBucket: string): Promise<DayGroup[]> =>
			queryClient.fetchQuery({
				queryKey: ['timeline-bucket', key, timeBucket],
				queryFn: ({signal}) =>
					repository.getBucketAssets(timeBucket, scope ?? MAIN_TIMELINE, signal).then((assets) => groupAssetsByDay(assets, scope?.order)),
				staleTime: Infinity,
				gcTime: Infinity,
				retry: ASSETS_QUERY_CONFIG.retry,
			}),
		[queryClient, repository, key, scope]
	);

	const requestMonths = useCallback(
		(timeBuckets: string[], {retryFailed = false}: RequestMonthsOptions = {}) => {
			if (!scope) return;
			if (!mirrorsRef.current || mirrorsRef.current.repository !== repository || mirrorsRef.current.scope !== key) {
				mirrorsRef.current = {repository, scope: key, loaded: new Map(), failed: new Set(), pending: new Set()};
			}
			const mirrors = mirrorsRef.current;
			if (retryFailed && mirrors.failed.size > 0) {
				mirrors.failed = new Set();
				setFailedState({repository, scope: key, months: new Set()});
			}
			for (const timeBucket of timeBuckets) {
				if (mirrors.loaded.has(timeBucket) || mirrors.pending.has(timeBucket) || mirrors.failed.has(timeBucket)) {
					continue;
				}
				mirrors.pending.add(timeBucket);
				fetchMonth(timeBucket)
					.then((dayGroups) => {
						if (mirrorsRef.current !== mirrors) return;
						mirrors.loaded.set(timeBucket, dayGroups);
						setLoadedState({repository, scope: key, months: new Map(mirrors.loaded)});
					})
					.catch(() => {
						if (mirrorsRef.current !== mirrors) return;
						mirrors.failed.add(timeBucket);
						setFailedState({repository, scope: key, months: new Set(mirrors.failed)});
					})
					.then(() => mirrors.pending.delete(timeBucket));
			}
		},
		[repository, key, scope, fetchMonth]
	);

	const timeline = useMemo(
		() => ({scope: scope ?? MAIN_TIMELINE, allBuckets: buckets, loadedMonths, failedMonths, requestMonths, fetchMonth}),
		[scope, buckets, loadedMonths, failedMonths, requestMonths, fetchMonth]
	);

	return {
		allBuckets: buckets,
		isLoading,
		isError,
		error,
		loadedMonths,
		failedMonths,
		requestMonths,
		timeline,
	};
};
