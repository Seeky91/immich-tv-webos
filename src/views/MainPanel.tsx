import React, {useCallback, useState, useRef, useMemo, useEffect} from 'react';
import {Panel, Header} from '@enact/sandstone/Panels';
import Scroller from '@enact/sandstone/Scroller';
import ri from '@enact/ui/resolution';
import {AssetCard} from '../components/AssetCard';
import {DateHeader} from '../components/DateHeader';
import {MediaViewer} from '../components/MediaViewer/MediaViewer';
import {useInfiniteGroupedAssets, useBucketMetadataMap} from '../hooks/useAssets';
import {useAllAssets} from '../hooks/useAllAssets';
import {calculateBucketHeight} from '../utils/justifiedLayout';
import type {ImmichAPI} from '../api/immich';
import type {ImmichAsset} from '../api/types';
import css from './MainPanel.module.less';

interface MainPanelProps {
	api: ImmichAPI;
}

const MainPanel: React.FC<MainPanelProps> = ({api}) => {
	const contentRef = useRef<HTMLDivElement>(null);

	const {data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, allBuckets} = useInfiniteGroupedAssets(api);

	/* Media viewer state */
	const [viewerState, setViewerState] = useState<{isOpen: boolean; assetIndex: number} | null>(null);

	/* Get all assets (without headers) for viewer navigation */
	const allAssets = useAllAssets(data);

	// Add viewport width tracking
	const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

	useEffect(() => {
		const handleResize = () => setViewportWidth(window.innerWidth);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Fetch metadata for all buckets
	const {data: metadataMap} = useBucketMetadataMap(api, allBuckets);

	// Calculate deterministic height map
	const heightMap = useMemo(() => {
		if (!metadataMap || metadataMap.size === 0) {
			console.log('[HeightMap] Metadata not loaded yet or empty');
			return new Map<string, number>();
		}

		const map = new Map<string, number>();

		metadataMap.forEach((metadata, date) => {
			const height = calculateBucketHeight(metadata.ratios, viewportWidth);
			map.set(date, height);
		});

		console.log('[HeightMap] Built height map:', {
			bucketCount: map.size,
			totalHeight: Array.from(map.values()).reduce((sum, h) => sum + h, 0),
			metadataMapSize: metadataMap.size,
			allBucketsLength: allBuckets.length,
		});

		return map;
	}, [metadataMap, viewportWidth, allBuckets.length]);

	// Track heightMap size to force re-renders when it changes
	const heightMapSize = heightMap.size;

	// Calculate exact total height
	const exactTotalHeight = useMemo(() => {
		const total = Array.from(heightMap.values()).reduce((sum, h) => sum + h, 0);
		return total;
	}, [heightMap, heightMapSize]);

	// Calculate exact loaded height
	const exactLoadedHeight = useMemo(() => {
		if (!data?.pages) return 0;

		const loaded = data.pages.reduce((sum, page) => {
			return (
				sum +
				page.groups.reduce((pageSum, group) => {
					const height = heightMap.get(group.timeBucket) || 0;
					return pageSum + height;
				}, 0)
			);
		}, 0);
		return loaded;
	}, [data, heightMap, heightMapSize]);

	// Exact placeholder (pixel-perfect!)
	const placeholderHeight = useMemo(() => {
		const height = Math.max(0, exactTotalHeight - exactLoadedHeight);
		console.log('[Placeholder]', {
			exactTotalHeight,
			exactLoadedHeight,
			placeholderHeight: height,
			loadedPages: data?.pages.length || 0,
			heightMapSize,
		});
		return height;
	}, [exactTotalHeight, exactLoadedHeight, data?.pages.length, heightMapSize]);

	const handleSelectAsset = useCallback(
		(asset: ImmichAsset) => {
			const index = allAssets.findIndex((a) => a.id === asset.id);
			if (index !== -1) {
				setViewerState({
					isOpen: true,
					assetIndex: index,
				});
			}
		},
		[allAssets]
	);

	const handleCloseViewer = useCallback(() => {
		setViewerState(null);
	}, []);

	const handleNavigateViewer = useCallback(
		(direction: 'prev' | 'next') => {
			setViewerState((prev) => {
				if (!prev) return null;
				const newIndex = direction === 'prev' ? Math.max(0, prev.assetIndex - 1) : Math.min(allAssets.length - 1, prev.assetIndex + 1);
				return {...prev, assetIndex: newIndex};
			});
		},
		[allAssets.length]
	);

	// Use refs to always get latest values in scroll handler
	const placeholderHeightRef = useRef(placeholderHeight);
	const exactTotalHeightRef = useRef(exactTotalHeight);
	const exactLoadedHeightRef = useRef(exactLoadedHeight);
	const heightMapSizeRef = useRef(heightMapSize);

	useEffect(() => {
		placeholderHeightRef.current = placeholderHeight;
		exactTotalHeightRef.current = exactTotalHeight;
		exactLoadedHeightRef.current = exactLoadedHeight;
		heightMapSizeRef.current = heightMapSize;
	}, [placeholderHeight, exactTotalHeight, exactLoadedHeight, heightMapSize]);

	const handleScrollStop = useCallback(
		({scrollTop}: {scrollTop: number; scrollLeft: number}) => {
			if (!hasNextPage || isFetchingNextPage) return;

			// Get content and scroller elements for proximity calculation
			const contentElement = contentRef.current;
			if (!contentElement) return;

			// Find the scroller's scrollable container (parent of content)
			const scrollerElement = contentElement.closest('.Scroller_Scroller') || contentElement.parentElement;
			if (!scrollerElement) return;

			const clientHeight = scrollerElement.clientHeight; // Viewport height
			const scrollHeight = contentElement.scrollHeight; // Total height (includes placeholder)

			// Get latest values from refs
			const currentPlaceholderHeight = placeholderHeightRef.current;
			const currentExactTotalHeight = exactTotalHeightRef.current;
			const currentExactLoadedHeight = exactLoadedHeightRef.current;
			const currentHeightMapSize = heightMapSizeRef.current;

			// Calculate actual loaded content height (exclude placeholder)
			const loadedContentHeight = scrollHeight - currentPlaceholderHeight;

			// Distance from bottom of LOADED content (not placeholder)
			const distanceFromBottom = loadedContentHeight - (scrollTop + clientHeight);

			// Trigger when within 1.5 viewports of loaded content end
			const threshold = clientHeight * 1.5;

			// Debug logging
			console.log('[Scroll Debug]', {
				scrollTop,
				scrollHeight,
				placeholderHeight: currentPlaceholderHeight,
				exactTotalHeight: currentExactTotalHeight,
				exactLoadedHeight: currentExactLoadedHeight,
				heightMapSize: currentHeightMapSize,
				loadedContentHeight,
				clientHeight,
				distanceFromBottom,
				threshold,
				shouldFetch: distanceFromBottom < threshold,
				hasNextPage,
				isFetchingNextPage,
			});

			if (distanceFromBottom < threshold) {
				fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage]
	);

	if (isLoading) {
		return (
			<Panel>
				<Header title="Immich TV" />
				<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
					<p>Loading…</p>
				</div>
			</Panel>
		);
	}

	if (isError) {
		return (
			<Panel>
				<Header title="Immich TV" />
				<div style={{padding: ri.scale(40), textAlign: 'center'}}>
					<h2>Error loading assets</h2>
					<p>{error instanceof Error ? error.message : 'Unknown error'}</p>
				</div>
			</Panel>
		);
	}

	return (
		<Panel className={css.mainPanel}>
			<Scroller direction="vertical" onScrollStop={handleScrollStop} verticalScrollbar="visible" focusableScrollbar>
				<div ref={contentRef} className={css.contentContainer}>
					{/* Loaded content */}
					{data?.pages.map((page, pageIndex) =>
						page.groups.map((group, groupIndex) => (
							<div key={`${pageIndex}-${groupIndex}`} className={css.dateGroup}>
								{/* Full-width header outside grid */}
								<div className={css.dateHeaderDivider}>
									<DateHeader displayDate={group.displayDate} count={group.count} />
								</div>

								{/* Grid container for assets */}
								<div className={css.assetsGrid}>
									{group.assets.map((asset) => (
										<AssetCard key={asset.id} asset={asset} api={api} onSelect={handleSelectAsset} />
									))}
								</div>
							</div>
						))
					)}

					{isFetchingNextPage && (
						<div className={css.loadingIndicator}>
							<p>Loading more…</p>
						</div>
					)}

					{/* Placeholder for unloaded buckets - makes scrollbar reflect total timeline */}
					{placeholderHeight > 0 && (
						<div className={css.scrollPlaceholder} style={{height: `${placeholderHeight}px`}} aria-hidden="true" />
					)}
				</div>
			</Scroller>
			{viewerState?.isOpen && (
				<MediaViewer asset={allAssets[viewerState.assetIndex]} allAssets={allAssets} currentIndex={viewerState.assetIndex} onClose={handleCloseViewer} onNavigate={handleNavigateViewer} api={api} />
			)}
		</Panel>
	);
};

export default MainPanel;
