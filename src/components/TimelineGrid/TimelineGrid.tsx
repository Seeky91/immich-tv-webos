import React, {useCallback, useEffect, useMemo} from 'react';
import {VirtualList} from '@enact/sandstone/VirtualList';
import ri from '@enact/ui/resolution';
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
	const totalCount = useMemo(() => groups.reduce((sum, g) => sum + g.count, 0), [groups]);
	const getAssetAt = useCallback(
		(globalIndex: number): TimelineAsset | null => {
			let offset = 0;
			for (const group of groups) {
				if (globalIndex < offset + group.count) {
					return group.assets[globalIndex - offset] ?? null;
				}
				offset += group.count;
			}
			return null;
		},
		[groups]
	);
	const viewer = useMediaViewer(totalCount);

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

	const itemSizes = useMemo(() => {
		const headerBlock = ri.scale(BUCKET_HEADER_HEIGHT_PX) + ri.scale(BUCKET_HEADER_MARGIN_PX);
		const fallback = ri.scale(ESTIMATED_ROW_HEIGHT_PX);
		return virtualItems.map((item) => {
			if (item.kind === 'placeholder') return item.height;
			const layout = layoutMap.get(item.timeBucket);
			return layout ? layout.totalHeight + headerBlock : heightMap.get(item.timeBucket) ?? fallback;
		});
	}, [virtualItems, layoutMap, heightMap]);

	const {handleScroll} = useScrollPagination({
		hasNextPage: pagination?.hasNextPage ?? false,
		isFetchingNextPage: pagination?.isFetchingNextPage ?? false,
		fetchNextPage: pagination?.fetchNextPage ?? noop,
		loadedGroupCount: groups.length,
	});

	useEffect(() => {
		if (!pagination || !viewer.state?.isOpen) return;
		if (!pagination.hasNextPage || pagination.isFetchingNextPage) return;
		if (viewer.state.assetIndex >= totalCount - MEDIA_VIEWER_PREFETCH_THRESHOLD) {
			pagination.fetchNextPage();
		}
	}, [viewer.state, totalCount, pagination]);

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

	return (
		<>
			<ErrorBoundary>
				<VirtualList
					dataSize={virtualItems.length}
					itemSize={{minSize: ri.scale(ESTIMATED_ROW_HEIGHT_PX), size: itemSizes}}
					itemRenderer={renderItem}
					direction="vertical"
					scrollMode="native"
					verticalScrollbar="visible"
					onScroll={pagination ? handleScroll : undefined}
					onScrollStop={pagination ? handleScroll : undefined}
					style={style}
				/>
			</ErrorBoundary>
			{viewer.state?.isOpen && (
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

const noop = () => {};

export default TimelineGrid;
