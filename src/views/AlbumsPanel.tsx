import React, {useCallback, useState} from 'react';
import {AlbumCard} from '../components/AlbumCard';
import {CollectionGrid} from '../components/CollectionGrid/CollectionGrid';
import {QueryStateView} from '../components/QueryStateView';
import AlbumView from './AlbumView';
import {useAlbums} from '../hooks/useAlbums';
import type {RoutePanelProps} from '../types/navigation';
import {formatCount} from '../utils/FormattingService';

const AlbumsPanel: React.FC<RoutePanelProps> = ({contentWidth}) => {
	const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
	const {data: albums, isLoading, error} = useAlbums();

	const handleSelectAlbum = useCallback((albumId: string) => {
		setSelectedAlbumId(albumId);
	}, []);

	const handleBack = useCallback(() => setSelectedAlbumId(null), []);

	if (selectedAlbumId) {
		return <AlbumView albumId={selectedAlbumId} onBack={handleBack} contentWidth={contentWidth} />;
	}

	return (
		<QueryStateView
			isLoading={isLoading}
			error={error}
			isEmpty={!albums?.length}
			loadingText="Loading albums…"
			emptyText="No albums found."
		>
			<CollectionGrid title="Albums" subtitle={albums ? formatCount(albums.length, 'album') : undefined}>
				{albums?.map((album) => (
					<AlbumCard key={album.id} album={album} onSelect={handleSelectAlbum} />
				))}
			</CollectionGrid>
		</QueryStateView>
	);
};

export default AlbumsPanel;
