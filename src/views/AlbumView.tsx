import React, {useMemo} from 'react';
import {useAlbumDetails} from '../hooks/useAlbumDetails';
import {useTimeline} from '../hooks/useTimeline';
import {AssetGridView} from '../components/AssetGridView';
import type {TimelineScope} from '../domain/types';
import {formatCount} from '../utils/FormattingService';

interface AlbumViewProps {
	albumId: string;
	onBack: () => void;
	contentWidth: number;
}

const AlbumView: React.FC<AlbumViewProps> = ({albumId, onBack, contentWidth}) => {
	const {data: album, isLoading: isAlbumLoading, error: albumError} = useAlbumDetails(albumId);

	// The timeline waits for the album's order, which drives the server-side sort.
	const scope = useMemo<TimelineScope | null>(() => (album ? {albumId, order: album.order} : null), [albumId, album]);
	const {timeline, isLoading: isTimelineLoading, error: timelineError} = useTimeline(scope);

	return (
		<AssetGridView
			title={album?.albumName ?? ''}
			subtitle={album ? formatCount(album.assetCount, 'item') : ''}
			timeline={timeline}
			isLoading={isAlbumLoading || isTimelineLoading}
			error={albumError ?? timelineError}
			isEmpty={!album || timeline.allBuckets.length === 0}
			emptyText="This album is empty."
			spotlightId="album-grid"
			onBack={onBack}
			contentWidth={contentWidth}
		/>
	);
};

export default AlbumView;
