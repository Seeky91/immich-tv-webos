import React, {useCallback, useMemo} from 'react';
import Spottable from '@enact/spotlight/Spottable';
import type {SpottableProps} from '@enact/spotlight/Spottable';
import type {ImmichAlbum} from '../api/types';
import type {ImmichAPI} from '../api/immich';
import css from './AlbumCard.module.less';

type SpottableDivProps = React.HTMLAttributes<HTMLDivElement> & SpottableProps;
const SpottableDiv = Spottable('div') as React.ComponentType<SpottableDivProps>;

interface AlbumCardProps {
	album: ImmichAlbum;
	api: ImmichAPI;
	onSelect?: (albumId: string) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = React.memo(({album, api, onSelect}) => {
	const thumbnailUrl = useMemo(
		() => (album.albumThumbnailAssetId ? api.getAlbumThumbnailUrl(album.albumThumbnailAssetId) : null),
		[api, album.albumThumbnailAssetId]
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
