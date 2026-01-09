import React, {useCallback, useMemo, useState} from 'react';
import {Panel, Header} from '@enact/sandstone/Panels';
import Scroller from '@enact/sandstone/Scroller';
import ri from '@enact/ui/resolution';
import {AssetCard} from '../components/AssetCard';
import {DateHeader} from '../components/DateHeader';
import {MediaViewer} from '../components/MediaViewer/MediaViewer';
import {useInfiniteGroupedAssets} from '../hooks/useAssets';
import type {ImmichAPI} from '../api/immich';
import type {ImmichAsset} from '../api/types';
import css from './MainPanel.module.less';

interface MainPanelProps {
	api: ImmichAPI;
}

const MainPanel: React.FC<MainPanelProps> = ({api}) => {
	const {data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage} = useInfiniteGroupedAssets(api);

	/* Media viewer state */
	const [viewerState, setViewerState] = useState<{
		isOpen: boolean;
		assetIndex: number;
	} | null>(null);

	/* Get all assets (without headers) for viewer navigation */
	const allAssets = useMemo<ImmichAsset[]>(() => {
		if (!data?.pages) return [];
		return data.pages.flatMap((page) => page.groups.flatMap((group) => group.assets));
	}, [data]);

	const handleSelectAsset = useCallback(
		(asset: ImmichAsset) => {
			// Find index in allAssets array
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
				const newIndex =
					direction === 'prev'
						? Math.max(0, prev.assetIndex - 1)
						: Math.min(allAssets.length - 1, prev.assetIndex + 1);
				return {...prev, assetIndex: newIndex};
			});
		},
		[allAssets.length]
	);

	const handleScrollStop = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
		<Panel>
			<Header title="Immich TV" />
			<Scroller direction="vertical" onScrollStop={handleScrollStop} verticalScrollbar="visible">
				<div className={css.contentContainer}>
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
										<AssetCard
											key={asset.id}
											asset={asset}
											thumbnailUrl={api.getThumbnailUrl(asset.id)}
											onSelect={handleSelectAsset}
										/>
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
				</div>
			</Scroller>
			{viewerState?.isOpen && (
				<MediaViewer
					asset={allAssets[viewerState.assetIndex]}
					allAssets={allAssets}
					currentIndex={viewerState.assetIndex}
					onClose={handleCloseViewer}
					onNavigate={handleNavigateViewer}
					api={api}
				/>
			)}
		</Panel>
	);
};

export default MainPanel;
