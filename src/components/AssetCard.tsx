import React, {useCallback, useMemo} from 'react';
import Icon from '@enact/sandstone/Icon';
import {formatDuration} from '../utils/formatters';
import type {ImmichAsset} from '../api/types';
import type {ImmichAPI} from '../api/immich';
import css from './AssetCard.module.less';

interface AssetCardProps {
	asset: ImmichAsset;
	api: ImmichAPI;
	onSelect?: (asset: ImmichAsset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = React.memo(({asset, api, onSelect}) => {
	const isVideo = asset.type === 'VIDEO';
	const thumbnailUrl = useMemo(() => api.getThumbnailUrl(asset.id), [api, asset.id]);

	const handleClick = useCallback(() => {
		if (onSelect) {
			onSelect(asset);
		}
	}, [asset, onSelect]);

	return (
		<div className={css.assetCard} onClick={handleClick} tabIndex={0}>
			<img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />

			{isVideo && (
				<>
					<div className={css.playIconOverlay}>
						<Icon size={48}>play</Icon>
					</div>

					{asset.duration && <div className={css.durationBadge}>{formatDuration(asset.duration)}</div>}
				</>
			)}
		</div>
	);
});

AssetCard.displayName = 'AssetCard';
