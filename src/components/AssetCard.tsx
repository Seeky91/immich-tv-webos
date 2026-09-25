import React, {useCallback, useMemo, useState} from 'react';
import Icon from '@enact/sandstone/Icon';
import {formatDuration} from '../utils/FormattingService';
import {SpottableDiv} from '../utils/spotlight';
import {useRepository} from '../domain/RepositoryContext';
import type {TimelineAsset} from '../domain/types';
import css from './AssetCard.module.less';

interface AssetCardProps {
	asset: TimelineAsset;
	index: number;
	onSelect?: (asset: TimelineAsset, index: number) => void;
	style?: React.CSSProperties;
}

// Mounted by URL so a recycled card or an account switch gets a fresh attempt. Only request
// the larger preview after a thumbnail fails; never loop retries for missing server media.
const AssetThumbnail: React.FC<{thumbnailUrl: string; assetId: string}> = ({thumbnailUrl, assetId}) => {
	const repository = useRepository();
	const [attempt, setAttempt] = useState<'thumbnail' | 'preview' | 'unavailable'>('thumbnail');
	const handleError = useCallback(() => {
		setAttempt((current) => current === 'thumbnail' ? 'preview' : 'unavailable');
	}, []);
	if (attempt === 'unavailable') {
		return (
			<div className={css.unavailable} role="img" aria-label="Preview unavailable">
				<Icon>picture</Icon>
				<span>Preview unavailable</span>
			</div>
		);
	}
	return (
		<img
			key={attempt}
			src={attempt === 'thumbnail' ? thumbnailUrl : repository.previewUrl(assetId)}
			alt=""
			className={css.thumbnail}
			loading="lazy"
			onError={handleError}
		/>
	);
};

export const AssetCard: React.FC<AssetCardProps> = React.memo(({asset, index, onSelect, style}) => {
	const repository = useRepository();
	const isVideo = asset.type === 'VIDEO';
	const thumbnailUrl = useMemo(() => repository.thumbnailUrl(asset.id), [repository, asset.id]);

	const handleClick = useCallback(() => {
		if (onSelect) {
			onSelect(asset, index);
		}
	}, [asset, index, onSelect]);

	return (
		<SpottableDiv className={css.assetCard} style={style} onClick={handleClick}>
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
