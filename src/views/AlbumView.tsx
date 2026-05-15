import React, {useEffect, useMemo} from 'react';
import Spotlight from '@enact/spotlight';
import Button from '@enact/sandstone/Button';
import ri from '@enact/ui/resolution';
import {useAlbumDetails} from '../hooks/useAlbumDetails';
import {useWebOSKeys} from '../hooks/useWebOSKeys';
import {createSpotlightContainer} from '../utils/spotlight';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import {groupAssetsByDay} from '../domain/transforms';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {QueryStateView} from '../components/QueryStateView';
import css from './AlbumView.module.less';

const GRID_SPOTLIGHT_ID = 'album-grid';
const Container = createSpotlightContainer({enterTo: 'last-focused'});
const GridContainer = createSpotlightContainer({enterTo: 'last-focused'});

interface AlbumViewProps {
	albumId: string;
	onBack: () => void;
	contentWidth: number;
}

const AlbumView: React.FC<AlbumViewProps> = ({albumId, onBack, contentWidth}) => {
	const {data: album, isLoading, error} = useAlbumDetails(albumId);

	useWebOSKeys({onBack});

	const loadedGroups = useMemo(() => groupAssetsByDay(album?.assets ?? [], album?.order), [album]);

	// When the album finishes loading, move focus into the photo grid so the user can start
	// navigating photos right away. The back button remains reachable via remote Back (above)
	// and via D-pad up from the top row. rAF defers focus to after VirtualList paints its first
	// items — calling Spotlight.focus before they mount silently no-ops.
	useEffect(() => {
		if (!album?.assets.length) return;
		const raf = requestAnimationFrame(() => Spotlight.focus(GRID_SPOTLIGHT_ID));
		return () => cancelAnimationFrame(raf);
	}, [album]);

	return (
		<QueryStateView
			isLoading={isLoading}
			error={error}
			isEmpty={!album}
			loadingText="Loading…"
			emptyText=""
		>
			{album && (
				<Container className={css.view}>
					<div className={css.header} style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX)}}>
						<Button icon="arrowlargeleft" size="small" onClick={onBack} />
						<span className={css.title}>{album.albumName}</span>
						<span className={css.count}>{album.assetCount} items</span>
					</div>
					<GridContainer spotlightId={GRID_SPOTLIGHT_ID} className={css.listContainer}>
						<TimelineGrid
							groups={loadedGroups}
							contentWidth={contentWidth}
							style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
						/>
					</GridContainer>
				</Container>
			)}
		</QueryStateView>
	);
};

export default AlbumView;
