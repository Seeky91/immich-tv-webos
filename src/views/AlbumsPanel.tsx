import React, {useCallback, useState} from 'react';
import Scroller from '@enact/sandstone/Scroller';
import {AlbumCard} from '../components/AlbumCard';
import {QueryStateView} from '../components/QueryStateView';
import AlbumView from './AlbumView';
import {useAlbums} from '../hooks/useAlbums';
import type {RoutePanelProps} from '../types/navigation';
import css from './AlbumsPanel.module.less';

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
			<Scroller direction="vertical" scrollMode="native" verticalScrollbar="visible" className={css.scroller}>
				<div className={css.grid}>
					{albums?.map((album) => (
						<AlbumCard key={album.id} album={album} onSelect={handleSelectAlbum} />
					))}
				</div>
			</Scroller>
		</QueryStateView>
	);
};

export default AlbumsPanel;
