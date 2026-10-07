import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import ri from '@enact/ui/resolution';
import {AssetCard} from '../AssetCard';
import {DateScrubber} from '../DateScrubber/DateScrubber';
import {DateHeader} from '../DateHeader';
import {MediaViewer} from '../MediaViewer/MediaViewer';
import {Slideshow} from '../Slideshow/Slideshow';
import {ErrorBoundary} from '../ErrorBoundary';
import {useMediaViewer} from '../../hooks/useMediaViewer';
import {useTimelineLayout} from '../../hooks/useTimelineLayout';
import {useViewerPosition} from '../../hooks/useViewerPosition';
import {focusTimelineViewport, useTimelineViewportFocus} from '../../hooks/useTimelineViewportFocus';
import {monthKey} from '../../domain/transforms';
import {createSpotlightContainer} from '../../utils/spotlight';
import type {JustifiedLayoutResult} from '../../utils/justifiedLayout';
import type {SlideshowSource} from '../../domain/slideshow';
import {
	BUCKET_HEADER_HEIGHT_PX,
	DATE_SCRUBBER_SPOTLIGHT_ID,
	DATE_SCRUBBER_WIDTH_PX,
	GRID_INSET_LEFT_PX,
	GRID_INSET_RIGHT_PX,
} from '../../utils/constants';
import type {RequestMonthsOptions} from '../../hooks/useTimeline';
import type {DayGroup, TimelineAsset, TimelineBucket, TimelineScope} from '../../domain/types';
import {anchoredScrollTop, bucketIndexAtOffset, buildGeometry, itemsInRange} from './timelineGeometry';
import css from './TimelineGrid.module.less';

export interface TimelineGridTimeline {
	scope: TimelineScope;
	allBuckets: TimelineBucket[];
	loadedMonths: ReadonlyMap<string, DayGroup[]>;
	failedMonths: ReadonlySet<string>;
	requestMonths: (timeBuckets: string[], options?: RequestMonthsOptions) => void;
	fetchMonth: (timeBucket: string) => Promise<DayGroup[]>;
}

interface TimelineGridProps {
	groups?: DayGroup[];
	contentWidth: number;
	timeline?: TimelineGridTimeline;
}

export interface TimelineGridHandle {
	startSlideshow: () => void;
}

interface SlideshowState {
	start: TimelineAsset | null;
	fromViewer: boolean;
}

const EMPTY_GROUPS: DayGroup[] = [];
// Stable empties: the grid re-renders on every scroll event, and a fresh `[]` would rebuild the
// whole layout and geometry each time.
const EMPTY_BUCKETS: TimelineBucket[] = [];
const EMPTY_MONTHS: ReadonlyMap<string, DayGroup[]> = new Map();

// Spotlight treats the scroller as an overflow container: it focuses cards without native
// scroll-into-view (useTimelineViewportFocus owns scrolling) and only enters on visible cards.
const ScrollContainer = createSpotlightContainer({enterTo: 'last-focused', overflow: true});

interface DayGroupContentProps {
	group: DayGroup;
	layout: JustifiedLayoutResult | undefined;
	// Cards [firstCard, endCard) are mounted: a day can hold hundreds of photos, and mounting them
	// all at once stalls a TV for hundreds of milliseconds.
	firstCard: number;
	endCard: number;
	onSelect: (asset: TimelineAsset) => void;
}

// Positioned by its parent: a month loading above moves the block without re-rendering its cards.
const DayGroupContent: React.FC<DayGroupContentProps> = React.memo(({group, layout, firstCard, endCard, onSelect}) => {
	// One style object per card for the block's lifetime, so rows scrolling in and out of the
	// mounted range don't re-render the cards that stay.
	const cardStyles = useMemo(
		() => layout?.assetLayouts.map(({top, left, width, height}): React.CSSProperties => ({position: 'absolute', top, left, width, height})),
		[layout]
	);
	return (
		<>
			<DateHeader timeBucket={group.timeBucket} />
			<div className={css.assetsGrid} style={layout ? {height: layout.totalHeight} : undefined}>
				{group.assets.slice(firstCard, endCard).map((asset, offset) => (
					<AssetCard key={asset.id} asset={asset} onSelect={onSelect} style={cardStyles?.[firstCard + offset]} />
				))}
			</div>
		</>
	);
});

DayGroupContent.displayName = 'DayGroupContent';

function cardRange(layout: JustifiedLayoutResult | undefined, gridTop: number, windowTop: number, windowBottom: number, count: number) {
	if (!layout) return {firstCard: 0, endCard: count};
	const [firstCard, endCard] = itemsInRange(layout.assetLayouts, windowTop - gridTop, windowBottom - gridTop);
	return {firstCard, endCard};
}

export const TimelineGrid = forwardRef<TimelineGridHandle, TimelineGridProps>(({groups, contentWidth, timeline}, ref) => {
	const dayGroups = useMemo(
		() => (timeline ? timeline.allBuckets.flatMap((bucket) => timeline.loadedMonths.get(bucket.timeBucket) ?? []) : groups ?? EMPTY_GROUPS),
		[groups, timeline]
	);
	const flatAssets = useMemo(() => dayGroups.flatMap((g) => g.assets), [dayGroups]);
	const totalCount = flatAssets.length;
	const getAssetAt = useCallback((i: number): TimelineAsset | null => flatAssets[i] ?? null, [flatAssets]);
	const viewer = useMediaViewer(flatAssets);
	const [slideshow, setSlideshow] = useState<SlideshowState | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const gridWidth = Math.max(0, contentWidth - (timeline ? ri.scale(DATE_SCRUBBER_WIDTH_PX) : 0));

	useTimelineViewportFocus({
		enabled: !viewer.state && !slideshow,
		viewportRef: scrollRef,
		rightEdgeSpotlightId: timeline ? DATE_SCRUBBER_SPOTLIGHT_ID : undefined,
	});

	const {layoutMap, heightMap, bucketHeights, bucketOffsets} = useTimelineLayout({
		allBuckets: timeline?.allBuckets ?? EMPTY_BUCKETS,
		loadedMonths: timeline?.loadedMonths ?? EMPTY_MONTHS,
		loadedGroups: dayGroups,
		viewportWidth: gridWidth,
	});

	// Unloaded months keep their estimated space: the full skeleton exists from the start, so any
	// point of the timeline is scrollable before it loads.
	const geometry = useMemo(() => {
		const groupHeight = (group: DayGroup) => heightMap.get(group.timeBucket) ?? 0;
		return timeline
			? buildGeometry(groupHeight, {allBuckets: timeline.allBuckets, loadedMonths: timeline.loadedMonths, bucketOffsets, bucketHeights})
			: buildGeometry(groupHeight, dayGroups);
	}, [timeline, dayGroups, heightMap, bucketOffsets, bucketHeights]);

	const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
	useEffect(() => {
		const node = scrollRef.current;
		if (!node || typeof ResizeObserver === 'undefined') return undefined;
		const observer = new ResizeObserver(() => setViewportHeight(node.clientHeight || window.innerHeight));
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	// The geometry the DOM scroll position currently refers to (updated as each new layout commits).
	const committedGeometryRef = useRef(geometry);

	// Last observed scroll position, tagged with the geometry it was measured in. After a month
	// loads it is re-anchored in render, so the render window already follows the on-screen
	// content: rendering the new layout with the stale offset would unmount the focused card and
	// drop focus. Only scroll events write it, never render, so no update can clobber another.
	const [scroll, setScroll] = useState({top: 0, geometry});
	const scrollTop = useMemo(
		() => (scroll.geometry === geometry ? scroll.top : anchoredScrollTop(scroll.geometry, geometry, scroll.top, viewportHeight)),
		[scroll, geometry, viewportHeight]
	);

	// One viewport of overscan each way: the row the D-pad moves to is always mounted.
	const windowTop = scrollTop - viewportHeight;
	const windowBottom = scrollTop + 2 * viewportHeight;
	const [firstVisible, endVisible] = itemsInRange(geometry.days, windowTop, windowBottom);
	const visibleDays = geometry.days.slice(firstVisible, endVisible);
	const headerHeight = ri.scale(BUCKET_HEADER_HEIGHT_PX);

	// The same anchoring, applied to the DOM: the scroll position moves with the content in the
	// commit that moved it, so nothing shifts on screen.
	useLayoutEffect(() => {
		const previous = committedGeometryRef.current;
		committedGeometryRef.current = geometry;
		const node = scrollRef.current;
		if (!node || previous === geometry) return;
		const target = anchoredScrollTop(previous, geometry, node.scrollTop, node.clientHeight);
		if (Math.abs(target - node.scrollTop) > 0.5) node.scrollTop = target;
	}, [geometry]);

	const requestMonthsAround = useCallback(
		(top: number, options?: RequestMonthsOptions) => {
			if (!timeline || bucketOffsets.length === 0) return;
			const first = bucketIndexAtOffset(bucketOffsets, bucketHeights, Math.max(0, top - viewportHeight));
			const last = bucketIndexAtOffset(bucketOffsets, bucketHeights, top + 2 * viewportHeight);
			// Plus one month each way: a held D-pad key crosses a viewport faster than a month
			// takes to arrive on a TV.
			timeline.requestMonths(
				timeline.allBuckets.slice(Math.max(0, first - 1), last + 2).map((bucket) => bucket.timeBucket),
				options
			);
		},
		[timeline, bucketOffsets, bucketHeights, viewportHeight]
	);

	useEffect(() => {
		requestMonthsAround(scrollTop);
	}, [requestMonthsAround, scrollTop]);

	const handleScroll = useCallback(() => {
		const node = scrollRef.current;
		if (!node) return;
		const top = node.scrollTop;
		const measuredIn = committedGeometryRef.current;
		// Scroll is a continuous event: React may defer its update by hundreds of milliseconds
		// on a TV, leaving the D-pad facing rows that aren't mounted yet. Rendering in the event
		// keeps the window in step with the scroll position (children are memoized: cheap).
		flushSync(() => setScroll((current) => (current.top === top && current.geometry === measuredIn ? current : {top, geometry: measuredIn})));
	}, []);

	const handleJump = useCallback(
		(timeBucket: string) => {
			if (!timeline) return;
			const index = timeline.allBuckets.findIndex((bucket) => bucket.timeBucket === timeBucket);
			if (index < 0) return;
			const target = bucketOffsets[index] ?? 0;
			const node = scrollRef.current;
			if (node) node.scrollTop = target;
			// Render the destination in this key event rather than after the async scroll event.
			setScroll({top: target, geometry: committedGeometryRef.current});
			requestMonthsAround(target, {retryFailed: true});
		},
		[timeline, bucketOffsets, requestMonthsAround]
	);

	const handleExitScrubber = useCallback(() => {
		const viewport = scrollRef.current;
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

	const openViewer = viewer.open;
	const handleSelectAsset = useCallback((asset: TimelineAsset) => openViewer(asset.id), [openViewer]);

	// Back from the viewer lands on the photo last shown, even after paging far from the card
	// that opened it: Spotlight would otherwise leave focus nowhere.
	const viewedAssetId = viewer.state?.assetId;
	const closeViewer = viewer.close;
	const handleCloseViewer = useCallback(() => {
		flushSync(closeViewer);
		const node = scrollRef.current;
		if (!node || !viewedAssetId) return;
		const cardSelector = `[data-asset-id="${viewedAssetId}"]`;
		if (!node.querySelector(cardSelector)) {
			const day = geometry.days.find((candidate) => candidate.group.assets.some((a) => a.id === viewedAssetId));
			if (!day) return;
			const pos = layoutMap.get(day.group.timeBucket)?.assetLayouts[day.group.assets.findIndex((a) => a.id === viewedAssetId)];
			const cardTop = day.top + headerHeight + (pos?.top ?? 0);
			node.scrollTop = Math.max(0, cardTop - (node.clientHeight - (pos?.height ?? 0)) / 2);
			flushSync(() => setScroll({top: node.scrollTop, geometry: committedGeometryRef.current}));
		}
		focusTimelineViewport(node, node.querySelector<HTMLElement>(cardSelector));
	}, [closeViewer, viewedAssetId, geometry, layoutMap, headerHeight]);

	// The inset lives on each block, inside the scroller's clip box, so focus rings and scaled
	// cards at the row edges aren't cropped.
	const insetStyle = useMemo(() => ({paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}), []);

	const viewerPosition = useViewerPosition(timeline, flatAssets, viewer.state?.assetIndex ?? -1);

	useImperativeHandle(ref, () => ({startSlideshow: () => setSlideshow({start: null, fromViewer: false})}), []);

	const handleStartSlideshow = useCallback(() => {
		setSlideshow({start: viewer.state ? flatAssets[viewer.state.assetIndex] ?? null : null, fromViewer: true});
		// The viewer's capture-phase key handlers would otherwise preempt the slideshow's.
		viewer.close();
	}, [viewer, flatAssets]);

	const slideshowSource = useMemo<SlideshowSource>(() => ({timeline, assets: flatAssets}), [timeline, flatAssets]);

	const handleSlideshowExit = useCallback(
		(last: TimelineAsset | null) => {
			const returnTo = slideshow?.fromViewer ? last ?? slideshow.start : null;
			setSlideshow(null);
			if (!returnTo) {
				const viewport = scrollRef.current;
				if (viewport) focusTimelineViewport(viewport);
				return;
			}
			if (timeline) {
				const month = monthKey(returnTo.localDateTime);
				const bucket = timeline.allBuckets.find((b) => monthKey(b.timeBucket) === month);
				if (bucket) timeline.requestMonths([bucket.timeBucket]);
			}
			viewer.open(returnTo.id);
		},
		[slideshow, timeline, viewer]
	);

	const activeBucketIndex = timeline ? bucketIndexAtOffset(bucketOffsets, bucketHeights, scrollTop) : 0;
	const activeBucket = timeline?.allBuckets[activeBucketIndex];
	const isActiveMonthLoading =
		!!timeline && !!activeBucket && !timeline.loadedMonths.has(activeBucket.timeBucket) && !timeline.failedMonths.has(activeBucket.timeBucket);
	const hasActiveMonthError = !!timeline && !!activeBucket && timeline.failedMonths.has(activeBucket.timeBucket);

	return (
		<>
			<ErrorBoundary>
				<div className={css.timelineShell}>
					<ScrollContainer className={css.timelineViewport}>
						<div ref={scrollRef} className={timeline ? `${css.scroller} ${css.noScrollbar}` : css.scroller} onScroll={handleScroll}>
							<div className={css.content} style={{height: geometry.totalHeight}}>
								{visibleDays.map((day) => {
									const layout = layoutMap.get(day.group.timeBucket);
									return (
										<div key={day.key} className={css.dateGroup} style={{transform: `translate3d(0, ${day.top}px, 0)`, ...insetStyle}}>
											<DayGroupContent
												group={day.group}
												layout={layout}
												{...cardRange(layout, day.top + headerHeight, windowTop, windowBottom, day.group.count)}
												onSelect={handleSelectAsset}
											/>
										</div>
									);
								})}
							</div>
						</div>
					</ScrollContainer>
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
						position={viewerPosition}
						onClose={handleCloseViewer}
						onNavigate={viewer.navigate}
						onStartSlideshow={handleStartSlideshow}
					/>
				</ErrorBoundary>
			)}
			{slideshow && (
				<ErrorBoundary>
					<Slideshow start={slideshow.start} source={slideshowSource} onExit={handleSlideshowExit} />
				</ErrorBoundary>
			)}
		</>
	);
});

TimelineGrid.displayName = 'TimelineGrid';
