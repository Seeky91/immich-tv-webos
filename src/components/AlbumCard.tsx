import React, {useCallback, useMemo} from 'react';
import {useRepository} from '../domain/RepositoryContext';
import type {Album} from '../domain/types';
import {ThumbnailCard} from './ThumbnailCard';

interface AlbumCardProps {
	album: Album;
	onSelect?: (albumId: string) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = React.memo(({album, onSelect}) => {
	const repository = useRepository();
	const thumbnailUrl = useMemo(
		() => (album.albumThumbnailAssetId ? repository.thumbnailUrl(album.albumThumbnailAssetId) : null),
		[repository, album.albumThumbnailAssetId]
	);

	const handleClick = useCallback(() => onSelect?.(album.id), [album.id, onSelect]);

	return (
		<ThumbnailCard
			thumbnailUrl={thumbnailUrl}
			title={album.albumName}
			secondaryLine={`${album.assetCount} items`}
			onClick={handleClick}
		/>
	);
});

AlbumCard.displayName = 'AlbumCard';
