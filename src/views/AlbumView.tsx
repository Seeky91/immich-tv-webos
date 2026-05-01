import React, {useMemo} from 'react';
import Button from '@enact/sandstone/Button';
import ri from '@enact/ui/resolution';
import {useAlbumDetails} from '../hooks/useAlbumDetails';
import {useWebOSKeys} from '../hooks/useWebOSKeys';
import {createSpotlightContainer} from '../utils/spotlight';
import {groupAssetsByDay} from '../domain/transforms';
import TimelineGrid from '../components/TimelineGrid/TimelineGrid';
import {QueryStateView} from '../components/QueryStateView';
import css from './AlbumView.module.less';

const Container = createSpotlightContainer({enterTo: 'default-element'});

interface AlbumViewProps {
	albumId: string;
	onBack: () => void;
	contentWidth: number;
}

const AlbumView: React.FC<AlbumViewProps> = ({albumId, onBack, contentWidth}) => {
	const {data: album, isLoading, error} = useAlbumDetails(albumId);

	useWebOSKeys({onBack});

	const loadedGroups = useMemo(() => groupAssetsByDay(album?.assets ?? []), [album]);

	return (
		<QueryStateView
			isLoading={isLoading}
			error={error}
			isEmpty={!album}
			loadingText="Loading…"
			errorText="Failed to load album."
			emptyText=""
			className={css.state}
		>
			{album && (
				<Container className={css.view}>
					<div className={css.header} style={{paddingLeft: ri.scale(72)}}>
						<Button icon="arrowlargeleft" size="small" onClick={onBack} data-spotlight-default-element />
						<span className={css.title}>{album.albumName}</span>
						<span className={css.count}>{album.assetCount} items</span>
					</div>
					<div className={css.listContainer}>
						<TimelineGrid
							groups={loadedGroups}
							contentWidth={contentWidth}
							style={{paddingLeft: ri.scale(72), paddingRight: ri.scale(40)}}
						/>
					</div>
				</Container>
			)}
		</QueryStateView>
	);
};

export default AlbumView;
