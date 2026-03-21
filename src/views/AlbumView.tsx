import React, {useCallback, useMemo, useState} from 'react';
import {VirtualList} from '@enact/sandstone/VirtualList';
import Button from '@enact/sandstone/Button';
import ri from '@enact/ui/resolution';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import {useAlbumDetails} from '../hooks/useAlbumDetails';
import {useWebOSKeys} from '../hooks/useWebOSKeys';
import {AssetCard} from '../components/AssetCard';
import {DateHeader} from '../components/DateHeader';
import {MediaViewer} from '../components/MediaViewer/MediaViewer';
import {ErrorBoundary} from '../components/ErrorBoundary';
import {calculateJustifiedLayout} from '../utils/justifiedLayout';
import {ESTIMATED_ROW_HEIGHT_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX} from '../utils/constants';
import type {JustifiedLayoutResult} from '../utils/justifiedLayout';
import type {ImmichAPI} from '../api/immich';
import type {ImmichAsset, GroupedAsset} from '../api/types';
import css from './AlbumView.module.less';

const Container = SpotlightContainerDecorator(
	{enterTo: 'default-element'},
	'div' as unknown as React.ComponentType<React.HTMLAttributes<HTMLDivElement>>
);

interface AlbumViewProps {
	albumId: string;
	onBack: () => void;
	api: ImmichAPI;
	contentWidth: number;
}

type GroupVirtualItem = GroupedAsset & {type: 'group'; globalStartIndex: number};

const assetRatio = (asset: ImmichAsset): number => {
	const width = asset.exifInfo?.exifImageWidth;
	const height = asset.exifInfo?.exifImageHeight;
	return width && height ? width / height : 1.0;
};

const AlbumView: React.FC<AlbumViewProps> = ({albumId, onBack, api, contentWidth}) => {
	const {data: album, isLoading, error} = useAlbumDetails(api, albumId);
	const [viewerIndex, setViewerIndex] = useState<number | null>(null);

	const handleCloseViewer = useCallback(() => setViewerIndex(null), []);
	const handleNavigate = useCallback((direction: 'prev' | 'next') => {
		setViewerIndex((i) => (i === null ? null : direction === 'prev' ? i - 1 : i + 1));
	}, []);
	const handleSelectAsset = useCallback((_asset: ImmichAsset, index: number) => setViewerIndex(index), []);

	useWebOSKeys({onBack: viewerIndex !== null ? handleCloseViewer : onBack});

	const loadedGroups = useMemo(() => api.groupAssetsByDay(album?.assets ?? []), [album, api]);

	const allAssets = useMemo(() => loadedGroups.flatMap((g) => g.assets), [loadedGroups]);

	const layoutMap = useMemo(() => {
		const map = new Map<string, JustifiedLayoutResult>();
		for (const group of loadedGroups) {
			map.set(group.timeBucket, calculateJustifiedLayout(group.assets.map(assetRatio), contentWidth));
		}
		return map;
	}, [loadedGroups, contentWidth]);

	const virtualItems = useMemo<GroupVirtualItem[]>(() => {
		let globalStart = 0;
		return loadedGroups.map((group) => {
			const item: GroupVirtualItem = {...group, type: 'group', globalStartIndex: globalStart};
			globalStart += group.count;
			return item;
		});
	}, [loadedGroups]);

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

	if (isLoading) return <div className={css.state}>Loading…</div>;
	if (error) return <div className={css.state}>Failed to load album.</div>;
	if (!album) return null;

	return (
		<Container className={css.view}>
			<div className={css.header} style={{paddingLeft: ri.scale(72)}}>
				<Button icon="arrowlargeleft" size="small" onClick={onBack} data-spotlight-default-element />
				<span className={css.title}>{album.albumName}</span>
				<span className={css.count}>{album.assetCount} items</span>
			</div>
			<div className={css.listContainer}>
				<ErrorBoundary>
					<VirtualList
						dataSize={virtualItems.length}
						itemSize={{minSize: ESTIMATED_ROW_HEIGHT_PX, size: itemSizes}}
						itemRenderer={renderItem}
						direction="vertical"
						scrollMode="native"
						verticalScrollbar="visible"
						style={{paddingLeft: ri.scale(72), paddingRight: ri.scale(40)}}
					/>
				</ErrorBoundary>
			</div>
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
		</Container>
	);
};

export default AlbumView;
