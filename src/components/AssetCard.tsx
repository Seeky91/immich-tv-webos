import React, {useCallback, useMemo} from 'react';
import Spottable from '@enact/spotlight/Spottable';
import type {SpottableProps} from '@enact/spotlight/Spottable';
import Icon from '@enact/sandstone/Icon';
import FormattingService from '../utils/FormattingService';
import type {ImmichAsset} from '../api/types';
import type {ImmichAPI} from '../api/immich';
import css from './AssetCard.module.less';

type SpottableDivProps = React.HTMLAttributes<HTMLDivElement> & SpottableProps;
const SpottableDiv = Spottable('div') as React.ComponentType<SpottableDivProps>;

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
		<SpottableDiv className={css.assetCard} style={style} onClick={handleClick}>
			<img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />

			{isVideo && (
				<>
					<div className={css.playIconOverlay}>
						<Icon size={48}>play</Icon>
					</div>

					{asset.duration && <div className={css.durationBadge}>{FormattingService.formatDuration(asset.duration)}</div>}
				</>
			)}
		</SpottableDiv>
	);
});

AssetCard.displayName = 'AssetCard';
