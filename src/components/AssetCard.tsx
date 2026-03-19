import React, {useCallback, useMemo} from 'react';
import Icon from '@enact/sandstone/Icon';
import FormattingService from '../utils/FormattingService';
import type {ImmichAsset} from '../api/types';
import type {ImmichAPI} from '../api/immich';
import css from './AssetCard.module.less';

interface AssetCardProps {
	asset: ImmichAsset;
	api: ImmichAPI;
	index: number;
	onSelect?: (asset: ImmichAsset, index: number) => void;
	style?: React.CSSProperties;
}

export const AssetCard: React.FC<AssetCardProps> = React.memo(({asset, api, index, onSelect, style}) => {
	const isVideo = asset.type === 'VIDEO';
	const thumbnailUrl = useMemo(() => api.getThumbnailUrl(asset.id), [api, asset.id]);

	const handleClick = useCallback(() => {
		if (onSelect) {
			onSelect(asset, index);
		}
	}, [asset, index, onSelect]);

	return (
		<div className={css.assetCard} style={style} onClick={handleClick} tabIndex={0}>
			<img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />

			{isVideo && (
				<>
					<div className={css.playIconOverlay}>
						<Icon size={48}>play</Icon>
					</div>

					{asset.duration && <div className={css.durationBadge}>{FormattingService.formatDuration(asset.duration)}</div>}
				</>
			)}
		</div>
	);
});

AssetCard.displayName = 'AssetCard';
