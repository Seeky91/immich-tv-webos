import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Icon from '@enact/sandstone/Icon';
import {formatDuration} from '../utils/FormattingService';
import {SpottableDiv} from '../utils/spotlight';
import {useRepository} from '../domain/RepositoryContext';
import type {TimelineAsset} from '../domain/types';
import css from './AssetCard.module.less';

interface AssetCardProps {
	asset: TimelineAsset;
	onSelect?: (asset: TimelineAsset) => void;
	style?: React.CSSProperties;
}

// Mounted by URL so a recycled card or an account switch gets a fresh attempt. Only request
// the larger preview after a thumbnail fails; never loop retries for missing server media.
const AssetThumbnail: React.FC<{thumbnailUrl: string; assetId: string}> = ({thumbnailUrl, assetId}) => {
	const repository = useRepository();
	const [attempt, setAttempt] = useState<'thumbnail' | 'preview' | 'unavailable'>('thumbnail');
	const imgRef = useRef<HTMLImageElement>(null);
	const handleError = useCallback(() => {
		setAttempt((current) => current === 'thumbnail' ? 'preview' : 'unavailable');
	}, []);
	// A card scrolled out of the window keeps downloading its thumbnail, holding a connection
	// ahead of the cards now on screen; dropping src cancels the request.
	useEffect(() => {
		const img = imgRef.current;
		return () => {
			if (img && !img.complete) img.removeAttribute('src');
		};
	}, [attempt]);
	if (attempt === 'unavailable') {
		return (
			<div className={css.unavailable} role="img" aria-label="Preview unavailable">
				<Icon>picture</Icon>
				<span>Preview unavailable</span>
			</div>
		);
	}
	// Not loading="lazy": the grid only mounts cards within a screen of the viewport, and lazy
	// loading would hold each request until its card is visible, so cards would scroll in blank.
	return (
		<img
			key={attempt}
			ref={imgRef}
			src={attempt === 'thumbnail' ? thumbnailUrl : repository.previewUrl(assetId)}
			alt=""
			className={css.thumbnail}
			onError={handleError}
		/>
	);
};

export const AssetCard: React.FC<AssetCardProps> = React.memo(({asset, onSelect, style}) => {
	const repository = useRepository();
	const isVideo = asset.type === 'VIDEO';
	const thumbnailUrl = useMemo(() => repository.thumbnailUrl(asset.id), [repository, asset.id]);

	const handleClick = useCallback(() => {
		if (onSelect) {
			onSelect(asset);
		}
	}, [asset, onSelect]);

	return (
		<SpottableDiv className={css.assetCard} style={style} onClick={handleClick} data-asset-id={asset.id}>
			<AssetThumbnail key={thumbnailUrl} thumbnailUrl={thumbnailUrl} assetId={asset.id} />

			{isVideo && (
				<div className={css.videoBadge}>
					<Icon size="tiny" className={css.videoIcon}>
						play
					</Icon>
					{asset.durationSeconds !== null && formatDuration(asset.durationSeconds)}
				</div>
			)}
		</SpottableDiv>
	);
});

AssetCard.displayName = 'AssetCard';
