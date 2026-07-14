import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {VirtualList} from '@enact/sandstone/VirtualList';
import ri from '@enact/ui/resolution';
import {AssetCard} from '../AssetCard';
import {DateScrubber} from '../DateScrubber/DateScrubber';
import {DateHeader} from '../DateHeader';
import {MediaViewer} from '../MediaViewer/MediaViewer';
import {ErrorBoundary} from '../ErrorBoundary';
import {useMediaViewer} from '../../hooks/useMediaViewer';
import {useTimelineLayout} from '../../hooks/useTimelineLayout';
import {focusTimelineViewport, useTimelineViewportFocus} from '../../hooks/useTimelineViewportFocus';
import {monthKey} from '../../domain/transforms';
import {DATE_SCRUBBER_SPOTLIGHT_ID, DATE_SCRUBBER_WIDTH_PX, ESTIMATED_ROW_HEIGHT_PX} from '../../utils/constants';
import type {RequestMonthsOptions} from '../../hooks/useTimeline';
import type {DayGroup, TimelineAsset, TimelineBucket} from '../../domain/types';
import css from './TimelineGrid.module.less';

interface TimelineGridTimeline {
	allBuckets: TimelineBucket[];
	loadedMonths: ReadonlyMap<string, DayGroup[]>;
	failedMonths: ReadonlySet<string>;
	requestMonths: (timeBuckets: string[], options?: RequestMonthsOptions) => void;
}

interface TimelineGridProps {
	groups?: DayGroup[];
	contentWidth: number;
	style?: React.CSSProperties;
	timeline?: TimelineGridTimeline;
}

type GroupVirtualItem = DayGroup & {kind: 'group'; globalStartIndex: number};
type PlaceholderVirtualItem = {kind: 'placeholder'; bucketIndex: number};
type VirtualItem = GroupVirtualItem | PlaceholderVirtualItem;

const EMPTY_GROUPS: DayGroup[] = [];
const EMPTY_MONTHS: ReadonlyMap<string, DayGroup[]> = new Map();

export function bucketIndexAtOffset(bucketOffsets: number[], bucketHeights: number[], scrollTop: number): number {
	let low = 0;
	let high = bucketOffsets.length - 1;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const start = bucketOffsets[middle] ?? 0;
		const end = start + (bucketHeights[middle] ?? 0);
		if (scrollTop < start) high = middle - 1;
		else if (scrollTop >= end) low = middle + 1;
		else return middle;
	}
	return Math.max(0, Math.min(bucketOffsets.length - 1, low));
}

// VirtualList only re-resolves its render window when a scroll event breaches thresholds it
// computed in the *previous* position space, so after a relayout the months under the viewport
// can stay blank even though they're loaded. Kick it with scroll events until the rendered
// window matches the DOM position again (bounded retries; verified on the rig).
function scheduleRenderWindowKick(
	getScrollNode: () => HTMLElement | null,
	timeline: TimelineGridTimeline,
	bucketOffsets: number[],
	bucketHeights: number[]
): () => void {
	const monthRenderedAtViewport = () => {
		const node = getScrollNode();
		if (!node) return true;
		const topIndex = bucketIndexAtOffset(bucketOffsets, bucketHeights, node.scrollTop);
		const topBucket = timeline.allBuckets[topIndex];
		if (!topBucket || !timeline.loadedMonths.has(topBucket.timeBucket)) return true;
		const viewportRect = node.getBoundingClientRect();
		return Array.from(node.querySelectorAll<HTMLElement>(`.${css.dateGroup}`)).some((group) => {
			const rect = group.getBoundingClientRect();
			return rect.bottom > viewportRect.top && rect.top < viewportRect.bottom;
		});
	};
	let attempts = 0;
	let timerId = 0;
	const kick = () => {
		const node = getScrollNode();
		if (!node) return;
		node.dispatchEvent(new Event('scroll'));
		if (attempts >= 4) return;
		attempts += 1;
		timerId = window.setTimeout(() => {
			if (!monthRenderedAtViewport()) kick();
		}, 80);
	};
	const rafId = requestAnimationFrame(kick);
	return () => {
		cancelAnimationFrame(rafId);
		window.clearTimeout(timerId);
	};
}

function findTimelineScrollNode(viewport: HTMLElement): HTMLElement | null {
	const virtualList = viewport.querySelector<HTMLElement>(`.${css.virtualList}`);
	if (!virtualList) return null;
	const candidates = [virtualList, ...Array.from(virtualList.querySelectorAll<HTMLElement>('*'))];
	return (
		candidates.find((node) => {
			const overflowY = window.getComputedStyle(node).overflowY;
			return node.scrollHeight > node.clientHeight && (overflowY === 'auto' || overflowY === 'scroll');
		}) ?? null
	);
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({groups, contentWidth, style, timeline}) => {
	const dayGroups = useMemo(
		() => (timeline ? timeline.allBuckets.flatMap((bucket) => timeline.loadedMonths.get(bucket.timeBucket) ?? []) : groups ?? EMPTY_GROUPS),
		[groups, timeline]
	);
	const flatAssets = useMemo(() => dayGroups.flatMap((g) => g.assets), [dayGroups]);
	const totalCount = flatAssets.length;
	const getAssetAt = useCallback((i: number): TimelineAsset | null => flatAssets[i] ?? null, [flatAssets]);
	const viewer = useMediaViewer(flatAssets);
	const viewportRef = useRef<HTMLDivElement>(null);
	const scrollTopRef = useRef(0);
	const [activeBucketIndex, setActiveBucketIndex] = useState(0);
	const gridWidth = Math.max(0, contentWidth - (timeline ? ri.scale(DATE_SCRUBBER_WIDTH_PX) : 0));

	// The DOM node is the single source of truth for scroll position: Enact's onScroll payload can
	// lag behind programmatic writes and mid-commit relayouts, so we never read event.scrollTop.
	const scrollNodeRef = useRef<HTMLElement | null>(null);
	const getScrollNode = useCallback((): HTMLElement | null => {
		const cached = scrollNodeRef.current;
		if (cached && cached.isConnected) return cached;
		const viewport = viewportRef.current;
		scrollNodeRef.current = viewport ? findTimelineScrollNode(viewport) : null;
		return scrollNodeRef.current;
	}, []);

	useTimelineViewportFocus({
		enabled: !viewer.state,
		viewportRef,
		rightEdgeSpotlightId: timeline ? DATE_SCRUBBER_SPOTLIGHT_ID : undefined,
	});

	const {layoutMap, heightMap, bucketHeights, bucketOffsets} = useTimelineLayout({
		allBuckets: timeline?.allBuckets ?? [],
		loadedMonths: timeline?.loadedMonths ?? EMPTY_MONTHS,
		loadedGroups: dayGroups,
		viewportWidth: gridWidth,
	});

	// One VirtualList item per loaded day group, one placeholder per unloaded month — the full
	// skeleton exists from the start, so any point of the timeline is scrollable before it loads.
	const virtualItems = useMemo<VirtualItem[]>(() => {
		const items: VirtualItem[] = [];
		let globalStart = 0;
		if (!timeline) {
			for (const group of dayGroups) {
				items.push({...group, kind: 'group', globalStartIndex: globalStart});
				globalStart += group.count;
			}
			return items;
		}
		timeline.allBuckets.forEach((bucket, bucketIndex) => {
			const monthGroups = timeline.loadedMonths.get(bucket.timeBucket);
			if (!monthGroups) {
				items.push({kind: 'placeholder', bucketIndex});
				return;
			}
			for (const group of monthGroups) {
				items.push({...group, kind: 'group', globalStartIndex: globalStart});
				globalStart += group.count;
			}
		});
		return items;
	}, [dayGroups, timeline]);

	const itemSizes = useMemo(() => {
		const fallback = ri.scale(ESTIMATED_ROW_HEIGHT_PX);
		return virtualItems.map((item) => {
			if (item.kind === 'placeholder') return Math.max(1, Math.round(bucketHeights[item.bucketIndex] ?? fallback));
			return heightMap.get(item.timeBucket) ?? fallback;
		});
	}, [virtualItems, heightMap, bucketHeights]);

	// Prefetch one viewport past each edge to reduce loading gaps during scrolling.
	const requestVisibleRange = useCallback(
		(scrollTop: number, options?: RequestMonthsOptions) => {
			if (!timeline || bucketOffsets.length === 0) return;
			const viewHeight = viewportRef.current?.clientHeight || window.innerHeight;
			const first = bucketIndexAtOffset(bucketOffsets, bucketHeights, Math.max(0, scrollTop - viewHeight));
			const last = bucketIndexAtOffset(bucketOffsets, bucketHeights, scrollTop + 2 * viewHeight);
			timeline.requestMonths(
				timeline.allBuckets.slice(first, last + 1).map((bucket) => bucket.timeBucket),
				options
			);
		},
		[timeline, bucketOffsets, bucketHeights]
	);

	const syncViewportState = useCallback(
		(scrollTop: number, options?: RequestMonthsOptions) => {
			if (!timeline || bucketOffsets.length === 0) return;
			requestVisibleRange(scrollTop, options);
			const index = bucketIndexAtOffset(bucketOffsets, bucketHeights, scrollTop);
			setActiveBucketIndex((current) => (current === index ? current : index));
		},
		[timeline, bucketOffsets, bucketHeights, requestVisibleRange]
	);

	const handleTimelineScroll = useCallback(() => {
		const scrollNode = getScrollNode();
		if (!scrollNode) return;
		scrollTopRef.current = scrollNode.scrollTop;
		syncViewportState(scrollNode.scrollTop);
	}, [getScrollNode, syncViewportState]);

	// Enact's debounced onScrollStop replays the callback captured when scrolling began, so a
	// directly-passed handler can run with month offsets from several commits ago (wrong active
	// month, spurious loads — seen on the rig). The ref indirection makes any cached callback
	// execute the current logic.
	const scrollHandlerRef = useRef(handleTimelineScroll);
	useLayoutEffect(() => {
		scrollHandlerRef.current = handleTimelineScroll;
	}, [handleTimelineScroll]);
	const stableScrollHandler = useCallback(() => scrollHandlerRef.current(), []);

	// Covers initial mount and every layout/data change. Scroll events processed mid-commit can
	// carry stale offsets (wrong active month, spurious month requests); re-syncing from the fresh
	// offsets after each commit self-heals both.
	useEffect(() => {
		syncViewportState(scrollTopRef.current);
	}, [syncViewportState]);

	// Scroll compensation, mirroring Immich web's TimelineMonth height setter: when month heights
	// change (estimate → actual), re-derive the anchor month from the previous geometry and restore
	// its fractional position, so content doesn't shift under the viewport.
	const previousLayoutRef = useRef<{offsets: number[]; heights: number[]} | null>(null);
	useLayoutEffect(() => {
		const previous = previousLayoutRef.current;
		previousLayoutRef.current = {offsets: bucketOffsets, heights: bucketHeights};
		if (!timeline || !previous || previous.offsets.length === 0 || bucketOffsets.length === 0) return undefined;
		const scrollNode = getScrollNode();
		if (!scrollNode) return undefined;
		const scrollTop = scrollNode.scrollTop;
		const index = bucketIndexAtOffset(previous.offsets, previous.heights, scrollTop);
		const previousHeight = previous.heights[index] ?? 0;
		const ratio = previousHeight > 0 ? Math.min(1, Math.max(0, (scrollTop - (previous.offsets[index] ?? 0)) / previousHeight)) : 0;
		const target = (bucketOffsets[index] ?? 0) + ratio * (bucketHeights[index] ?? 0);
		if (Math.abs(target - scrollTop) > 1) {
			scrollNode.scrollTop = target;
			scrollTopRef.current = target;
		}
		return scheduleRenderWindowKick(getScrollNode, timeline, bucketOffsets, bucketHeights);
	}, [timeline, bucketOffsets, bucketHeights, getScrollNode]);

	const handleJump = useCallback(
		(timeBucket: string) => {
			if (!timeline) return;
			const index = timeline.allBuckets.findIndex((bucket) => bucket.timeBucket === timeBucket);
			if (index < 0) return;
			const scrollNode = getScrollNode();
			const target = bucketOffsets[index] ?? 0;
			if (scrollNode) {
				scrollNode.scrollTop = target;
				scrollTopRef.current = target;
			}
			syncViewportState(target, {retryFailed: true});
		},
		[timeline, bucketOffsets, getScrollNode, syncViewportState]
	);

	const handleExitScrubber = useCallback(() => {
		const viewport = viewportRef.current;
		if (viewport) focusTimelineViewport(viewport);
	}, []);

	// Keep the months around the viewed asset loaded so viewer navigation rarely hits a gap.
	useEffect(() => {
		if (!timeline || !viewer.state) return;
		const asset = flatAssets[viewer.state.assetIndex];
		if (!asset) return;
		const month = monthKey(asset.localDateTime);
		const index = timeline.allBuckets.findIndex((bucket) => monthKey(bucket.timeBucket) === month);
		if (index < 0) return;
		const neighbours = timeline.allBuckets.slice(Math.max(0, index - 1), index + 2);
		timeline.requestMonths(neighbours.map((bucket) => bucket.timeBucket));
	}, [viewer.state, flatAssets, timeline]);

	const handleSelectAsset = useCallback((_a: TimelineAsset, i: number) => viewer.open(i), [viewer]);

	const renderItem = useCallback(
		({index}: {index: number}) => {
			const item = virtualItems[index];
			if (!item || item.kind === 'placeholder') {
				return <div aria-hidden="true" />;
			}
			const layout = layoutMap.get(item.timeBucket);
			return (
				<div className={css.dateGroup}>
					<div className={css.dateHeaderDivider}>
						<DateHeader timeBucket={item.timeBucket} count={item.count} />
					</div>
					<div className={css.assetsGrid} style={layout ? {height: layout.totalHeight} : undefined}>
						{item.assets.map((asset, assetIdx) => {
							const pos = layout?.assetLayouts[assetIdx];
							return (
								<AssetCard
									key={asset.id}
									asset={asset}
									index={item.globalStartIndex + assetIdx}
									onSelect={handleSelectAsset}
									style={pos ? {position: 'absolute', top: pos.top, left: pos.left, width: pos.width, height: pos.height} : undefined}
								/>
							);
						})}
					</div>
				</div>
			);
		},
		[virtualItems, layoutMap, handleSelectAsset]
	);

	const activeBucket = timeline?.allBuckets[activeBucketIndex];
	const isActiveMonthLoading =
		!!timeline && !!activeBucket && !timeline.loadedMonths.has(activeBucket.timeBucket) && !timeline.failedMonths.has(activeBucket.timeBucket);
	const hasActiveMonthError = !!timeline && !!activeBucket && timeline.failedMonths.has(activeBucket.timeBucket);

	return (
		<>
			<ErrorBoundary>
				<div className={css.timelineShell}>
					<div ref={viewportRef} className={css.timelineViewport}>
						<VirtualList
							className={css.virtualList}
							dataSize={virtualItems.length}
							itemSize={{minSize: ri.scale(ESTIMATED_ROW_HEIGHT_PX), size: itemSizes}}
							itemRenderer={renderItem}
							direction="vertical"
							scrollMode="native"
							verticalScrollbar={timeline ? 'hidden' : 'visible'}
							onScroll={timeline ? stableScrollHandler : undefined}
							onScrollStop={timeline ? stableScrollHandler : undefined}
							style={style}
						/>
					</div>
					{timeline && timeline.allBuckets.length > 0 && (
						<DateScrubber
							buckets={timeline.allBuckets}
							bucketHeights={bucketHeights}
							activeIndex={activeBucketIndex}
							isLoading={isActiveMonthLoading}
							hasError={hasActiveMonthError}
							onJump={handleJump}
							onExit={handleExitScrubber}
						/>
					)}
				</div>
			</ErrorBoundary>
			{viewer.state && (
				<ErrorBoundary>
					<MediaViewer
						getAssetAt={getAssetAt}
						totalCount={totalCount}
						currentIndex={viewer.state.assetIndex}
						onClose={viewer.close}
						onNavigate={viewer.navigate}
					/>
				</ErrorBoundary>
			)}
		</>
	);
};

TimelineGrid.displayName = 'TimelineGrid';
