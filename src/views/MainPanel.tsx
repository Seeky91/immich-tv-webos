import React, {useCallback, useState, useMemo} from 'react';
import {Panel, Header} from '@enact/sandstone/Panels';
import {VirtualList} from '@enact/sandstone/VirtualList';
import ri from '@enact/ui/resolution';
import {AssetCard} from '../components/AssetCard';
import {DateHeader} from '../components/DateHeader';
import {MediaViewer} from '../components/MediaViewer/MediaViewer';
import {ErrorBoundary} from '../components/ErrorBoundary';
import {useInfiniteGroupedAssets} from '../hooks/useAssets';
import {useAllAssets} from '../hooks/useAllAssets';
import {useHeightMap} from '../hooks/useHeightMap';
import {useScrollPagination} from '../hooks/useScrollPagination';
import {calculateJustifiedLayout} from '../utils/justifiedLayout';
import {ESTIMATED_ROW_HEIGHT_PX} from '../utils/constants';
import type {JustifiedLayoutResult} from '../utils/justifiedLayout';
import type {ImmichAPI} from '../api/immich';
import type {ImmichAsset, GroupedAsset} from '../api/types';
import css from './MainPanel.module.less';

interface MainPanelProps {
	api: ImmichAPI;
	contentWidth: number;
}

type GroupVirtualItem = GroupedAsset & {type: 'group'; globalStartIndex: number};
type PlaceholderVirtualItem = {type: 'placeholder'; height: number; globalStartIndex: number};
type VirtualItem = GroupVirtualItem | PlaceholderVirtualItem;

const MainPanel: React.FC<MainPanelProps> = ({api, contentWidth}) => {
	const {data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, allBuckets, metadataMap} = useInfiniteGroupedAssets(api);
	const [viewerState, setViewerState] = useState<{isOpen: boolean; assetIndex: number} | null>(null);
	const allAssets = useAllAssets(data);

	const loadedGroups = useMemo(() => data?.pages.flatMap((p) => p.groups) ?? [], [data]);

	const {heightMap, placeholderHeight} = useHeightMap({metadataMap, allBuckets, loadedGroups, viewportWidth: contentWidth});

	const layoutMap = useMemo(() => {
		const map = new Map<string, JustifiedLayoutResult>();
		metadataMap.forEach((metadata, date) => {
			map.set(date, calculateJustifiedLayout(metadata.ratios, contentWidth));
		});
		return map;
	}, [metadataMap, contentWidth]);

	const virtualItems = useMemo<VirtualItem[]>(() => {
		let globalStart = 0;
		const items: VirtualItem[] = loadedGroups.map((group) => {
			const item: GroupVirtualItem = {...group, type: 'group', globalStartIndex: globalStart};
			globalStart += group.count;
			return item;
		});
		if (placeholderHeight > 0) {
			items.push({type: 'placeholder', height: placeholderHeight, globalStartIndex: globalStart});
		}
		return items;
	}, [loadedGroups, placeholderHeight]);

	const handleSelectAsset = useCallback((_asset: ImmichAsset, index: number) => {
		setViewerState({isOpen: true, assetIndex: index});
	}, []);

	const handleCloseViewer = useCallback(() => setViewerState(null), []);

	const handleNavigateViewer = useCallback(
		(direction: 'prev' | 'next') => {
			setViewerState((prev) => {
				if (!prev) return null;
				const newIndex =
					direction === 'prev'
						? Math.max(0, prev.assetIndex - 1)
						: Math.min(allAssets.length - 1, prev.assetIndex + 1);
				return {...prev, assetIndex: newIndex};
			});
		},
		[allAssets.length]
	);

	const itemSizes = useMemo(
		() => virtualItems.map((item) => (item.type === 'placeholder' ? item.height : (heightMap.get(item.timeBucket) ?? ESTIMATED_ROW_HEIGHT_PX))),
		[virtualItems, heightMap]
	);

	const {handleScrollStop} = useScrollPagination({
		hasNextPage: !!hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		loadedGroupCount: loadedGroups.length,
	});

	const renderItem = useCallback(
		({index}: {index: number}) => {
			const item = virtualItems[index];
			if (!item || item.type === 'placeholder') {
				return <div aria-hidden="true" />;
			}
			const layout = layoutMap.get(item.timeBucket);
			return (
				<div className={css.dateGroup}>
					<div className={css.dateHeaderDivider}>
						<DateHeader displayDate={item.displayDate} count={item.count} />
					</div>
					<div className={css.assetsGrid} style={layout ? {height: layout.totalHeight} : undefined}>
						{item.assets.map((asset, assetIdx) => {
							const pos = layout?.assetLayouts[assetIdx];
							return (
								<AssetCard
									key={asset.id}
									asset={asset}
									api={api}
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
		[virtualItems, api, handleSelectAsset, layoutMap]
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
			<ErrorBoundary>
				<VirtualList
					dataSize={virtualItems.length}
					itemSize={{minSize: ESTIMATED_ROW_HEIGHT_PX, size: itemSizes}}
					itemRenderer={renderItem}
					direction="vertical"
					scrollMode="native"
					verticalScrollbar="visible"
					onScrollStop={handleScrollStop}
					style={{paddingRight: ri.scale(40)}}
				/>
			</ErrorBoundary>
			{viewerState?.isOpen && (
				<ErrorBoundary>
					<MediaViewer
						asset={allAssets[viewerState.assetIndex]}
						allAssets={allAssets}
						currentIndex={viewerState.assetIndex}
						onClose={handleCloseViewer}
						onNavigate={handleNavigateViewer}
						api={api}
					/>
				</ErrorBoundary>
			)}
		</Panel>
	);
};

export default MainPanel;
