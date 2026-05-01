import React, {useCallback, useMemo} from 'react';
import {SpottableDiv} from '../utils/spotlight';
import {useRepository} from '../domain/RepositoryContext';
import type {Album} from '../domain/types';
import css from './AlbumCard.module.less';

interface AlbumCardProps {
	album: Album;
	onSelect?: (albumId: string) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = React.memo(({album, onSelect}) => {
	const repository = useRepository();
	const thumbnailUrl = useMemo(
		() => (album.albumThumbnailAssetId ? repository.albumThumbnailUrl(album.albumThumbnailAssetId) : null),
		[repository, album.albumThumbnailAssetId]
	);

	const handleClick = useCallback(() => onSelect?.(album.id), [album.id, onSelect]);

	return (
		<SpottableDiv className={css.albumCard} onClick={handleClick}>
			{thumbnailUrl
				? <img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />
				: <div className={css.placeholder} />
			}
			<div className={css.info}>
				<span className={css.title}>{album.albumName}</span>
				<span className={css.count}>{album.assetCount} items</span>
			</div>
		</SpottableDiv>
	);
});

AlbumCard.displayName = 'AlbumCard';
