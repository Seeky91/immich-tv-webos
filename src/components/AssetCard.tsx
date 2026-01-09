import React, {useCallback} from 'react';
import Icon from '@enact/sandstone/Icon';
import type {ImmichAsset} from '../api/types';
import css from './AssetCard.module.less';

interface AssetCardProps {
	asset: ImmichAsset;
	thumbnailUrl: string;
	onSelect?: (asset: ImmichAsset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = React.memo(({asset, thumbnailUrl, onSelect}) => {
	const isVideo = asset.type === 'VIDEO';
	const duration = isVideo && asset.duration ? formatDuration(asset.duration) : null;

	const handleClick = useCallback(() => {
		if (onSelect) {
			onSelect(asset);
		}
	}, [asset, onSelect]);

	return (
		<div className={css.assetCard} onClick={handleClick} tabIndex={0}>
			<img src={thumbnailUrl} alt="" className={css.thumbnail} />

			{isVideo && (
				<>
					<div className={css.playIconOverlay}>
						<Icon size="large">play</Icon>
					</div>

					{duration && <div className={css.durationBadge}>{duration}</div>}
				</>
			)}
		</div>
	);
});

// Helper to format video duration (e.g., "0:01:23.456000" -> "1:23")
const formatDuration = (duration: string): string => {
	const parts = duration.split(':');
	if (parts.length < 2) return '';

	const hours = parseInt(parts[0], 10);
	const minutes = parseInt(parts[1], 10);
	const seconds = Math.floor(parseFloat(parts[2]));

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

AssetCard.displayName = 'AssetCard';

// ... (votre fonction formatDuration reste identique)
