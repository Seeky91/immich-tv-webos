import React, {useCallback, useEffect, useMemo} from 'react';
import {VirtualList} from '@enact/sandstone/VirtualList';
import {AssetCard} from '../AssetCard';
import {DateHeader} from '../DateHeader';
import {MediaViewer} from '../MediaViewer/MediaViewer';
import {ErrorBoundary} from '../ErrorBoundary';
import {useMediaViewer} from '../../hooks/useMediaViewer';
import {useHeightMap} from '../../hooks/useHeightMap';
import {useScrollPagination} from '../../hooks/useScrollPagination';
import {calculateJustifiedLayout} from '../../utils/justifiedLayout';
import {ESTIMATED_ROW_HEIGHT_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX, MEDIA_VIEWER_PREFETCH_THRESHOLD} from '../../utils/constants';
import type {JustifiedLayoutResult} from '../../utils/justifiedLayout';
import type {DayGroup, TimelineAsset, TimelineBucket} from '../../domain/types';
import css from './TimelineGrid.module.less';

export interface TimelineGridPagination {
	allBuckets: TimelineBucket[];
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
}

interface TimelineGridProps {
	groups: DayGroup[];
	contentWidth: number;
	style?: React.CSSProperties;
	pagination?: TimelineGridPagination;
}

type GroupVirtualItem = DayGroup & {kind: 'group'; globalStartIndex: number};
type PlaceholderVirtualItem = {kind: 'placeholder'; height: number; globalStartIndex: number};
type VirtualItem = GroupVirtualItem | PlaceholderVirtualItem;

const TimelineGrid: React.FC<TimelineGridProps> = ({groups, contentWidth, style, pagination}) => {
	const allAssets = useMemo(() => groups.flatMap((g) => g.assets), [groups]);
	const viewer = useMediaViewer(allAssets.length);

	const {heightMap, placeholderHeight} = useHeightMap({
		allBuckets: pagination?.allBuckets ?? [],
		loadedGroups: groups,
		viewportWidth: contentWidth,
	});

	const layoutMap = useMemo(() => {
		const map = new Map<string, JustifiedLayoutResult>();
		for (const group of groups) {
			map.set(group.timeBucket, calculateJustifiedLayout(group.assets.map((a) => a.ratio), contentWidth));
		}
		return map;
	}, [groups, contentWidth]);

	const virtualItems = useMemo<VirtualItem[]>(() => {
		let globalStart = 0;
		const items: VirtualItem[] = groups.map((group) => {
			const item: GroupVirtualItem = {...group, kind: 'group', globalStartIndex: globalStart};
			globalStart += group.count;
			return item;
		});
		if (pagination && placeholderHeight > 0) {
			items.push({kind: 'placeholder', height: placeholderHeight, globalStartIndex: globalStart});
		}
		return items;
	}, [groups, pagination, placeholderHeight]);

	const itemSizes = useMemo(
		() =>
			virtualItems.map((item) => {
				if (item.kind === 'placeholder') return item.height;
				const layout = layoutMap.get(item.timeBucket);
				return layout
					? layout.totalHeight + BUCKET_HEADER_HEIGHT_PX + BUCKET_HEADER_MARGIN_PX
					: heightMap.get(item.timeBucket) ?? ESTIMATED_ROW_HEIGHT_PX;
			}),
		[virtualItems, layoutMap, heightMap]
	);

	const {handleScrollStop} = useScrollPagination({
		hasNextPage: pagination?.hasNextPage ?? false,
		isFetchingNextPage: pagination?.isFetchingNextPage ?? false,
		fetchNextPage: pagination?.fetchNextPage ?? noop,
		loadedGroupCount: groups.length,
	});

	useEffect(() => {
		if (!pagination || !viewer.state?.isOpen) return;
		if (!pagination.hasNextPage || pagination.isFetchingNextPage) return;
		if (viewer.state.assetIndex >= allAssets.length - MEDIA_VIEWER_PREFETCH_THRESHOLD) {
			pagination.fetchNextPage();
		}
	}, [viewer.state, allAssets.length, pagination]);

	const handleSelectAsset = useCallback((_a: TimelineAsset, i: number) => viewer.open(i), [viewer.open]);

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

	return (
		<>
			<ErrorBoundary>
				<VirtualList
					dataSize={virtualItems.length}
					itemSize={{minSize: ESTIMATED_ROW_HEIGHT_PX, size: itemSizes}}
					itemRenderer={renderItem}
					direction="vertical"
					scrollMode="native"
					verticalScrollbar="visible"
					onScrollStop={pagination ? handleScrollStop : undefined}
					style={style}
				/>
			</ErrorBoundary>
			{viewer.state?.isOpen && (
				<ErrorBoundary>
					<MediaViewer
						asset={allAssets[viewer.state.assetIndex] ?? null}
						allAssets={allAssets}
						currentIndex={viewer.state.assetIndex}
						onClose={viewer.close}
						onNavigate={viewer.navigate}
					/>
				</ErrorBoundary>
			)}
		</>
	);
};

const noop = () => {};

export default TimelineGrid;
