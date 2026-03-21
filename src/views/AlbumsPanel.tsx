import React, {useCallback, useState} from 'react';
import Scroller from '@enact/sandstone/Scroller';
import {AlbumCard} from '../components/AlbumCard';
import AlbumView from './AlbumView';
import {useAlbums} from '../hooks/useAlbums';
import type {ImmichAPI} from '../api/immich';
import css from './AlbumsPanel.module.less';

interface AlbumsPanelProps {
	api: ImmichAPI;
	contentWidth: number;
}

const AlbumsPanel: React.FC<AlbumsPanelProps> = ({api, contentWidth}) => {
	const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
	const {data: albums, isLoading, error} = useAlbums(api);

	const handleSelectAlbum = useCallback((albumId: string) => {
		setSelectedAlbumId(albumId);
	}, []);

	const handleBack = useCallback(() => setSelectedAlbumId(null), []);

	if (selectedAlbumId) {
		return <AlbumView albumId={selectedAlbumId} onBack={handleBack} api={api} contentWidth={contentWidth} />;
	}

	if (isLoading) return <div className={css.state}>Loading albums…</div>;
	if (error) return <div className={css.state}>Failed to load albums.</div>;
	if (!albums?.length) return <div className={css.state}>No albums found.</div>;

	return (
		<Scroller direction="vertical" scrollMode="native" verticalScrollbar="visible" className={css.scroller}>
			<div className={css.grid}>
				{albums.map((album) => (
					<AlbumCard key={album.id} album={album} api={api} onSelect={handleSelectAlbum} />
				))}
			</div>
		</Scroller>
	);
};

export default AlbumsPanel;
