import React, {useCallback, useMemo, useState} from 'react';
import {VirtualList} from '@enact/sandstone/VirtualList';
import {AssetCard} from '../AssetCard';
import {DateHeader} from '../DateHeader';
import {MediaViewer} from '../MediaViewer/MediaViewer';
import {ErrorBoundary} from '../ErrorBoundary';
import {calculateJustifiedLayout} from '../../utils/justifiedLayout';
import {ESTIMATED_ROW_HEIGHT_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX} from '../../utils/constants';
import type {JustifiedLayoutResult} from '../../utils/justifiedLayout';
import type {ImmichAPI} from '../../api/immich';
import type {ImmichAsset, GroupedAsset} from '../../api/types';
import css from './GroupedTimeline.module.less';

interface GroupedTimelineProps {
	groups: GroupedAsset[];
	api: ImmichAPI;
	contentWidth: number;
	style?: React.CSSProperties;
}

type GroupVirtualItem = GroupedAsset & {type: 'group'; globalStartIndex: number};

const assetRatio = (asset: ImmichAsset): number => {
	const width = asset.exifInfo?.exifImageWidth;
	const height = asset.exifInfo?.exifImageHeight;
	return width && height ? width / height : 1.0;
};

const GroupedTimeline: React.FC<GroupedTimelineProps> = ({groups, api, contentWidth, style}) => {
	const [viewerIndex, setViewerIndex] = useState<number | null>(null);

	const handleCloseViewer = useCallback(() => setViewerIndex(null), []);
	const handleNavigate = useCallback((direction: 'prev' | 'next') => {
		setViewerIndex((i) => (i === null ? null : direction === 'prev' ? i - 1 : i + 1));
	}, []);
	const handleSelectAsset = useCallback((_asset: ImmichAsset, index: number) => setViewerIndex(index), []);

	const allAssets = useMemo(() => groups.flatMap((g) => g.assets), [groups]);

	const layoutMap = useMemo(() => {
		const map = new Map<string, JustifiedLayoutResult>();
		for (const group of groups) {
			map.set(group.timeBucket, calculateJustifiedLayout(group.assets.map(assetRatio), contentWidth));
		}
		return map;
	}, [groups, contentWidth]);

	const virtualItems = useMemo<GroupVirtualItem[]>(() => {
		let globalStart = 0;
		return groups.map((group) => {
			const item: GroupVirtualItem = {...group, type: 'group', globalStartIndex: globalStart};
			globalStart += group.count;
			return item;
		});
	}, [groups]);

	const itemSizes = useMemo(
		() =>
			virtualItems.map((item) => {
				const layout = layoutMap.get(item.timeBucket);
				return layout ? layout.totalHeight + BUCKET_HEADER_HEIGHT_PX + BUCKET_HEADER_MARGIN_PX : ESTIMATED_ROW_HEIGHT_PX;
			}),
		[virtualItems, layoutMap]
	);

	const renderItem = useCallback(
		({index}: {index: number}) => {
			const item = virtualItems[index];
			if (!item) return <div aria-hidden="true" />;
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
		[virtualItems, layoutMap, api, handleSelectAsset]
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
					style={style}
				/>
			</ErrorBoundary>
			{viewerIndex !== null && (
				<ErrorBoundary>
					<MediaViewer
						asset={allAssets[viewerIndex]}
						allAssets={allAssets}
						currentIndex={viewerIndex}
						onClose={handleCloseViewer}
						onNavigate={handleNavigate}
						api={api}
					/>
				</ErrorBoundary>
			)}
		</>
	);
};

export default GroupedTimeline;
