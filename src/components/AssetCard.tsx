import React, {useCallback, useMemo} from 'react';
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
			<img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />

			{isVideo && (
				<>
					<div className={css.playIconOverlay}>
						<Icon size={48}>play</Icon>
					</div>

					{asset.duration && <div className={css.durationBadge}>{formatDuration(asset.duration)}</div>}
				</>
			)}
		</SpottableDiv>
	);
});

AssetCard.displayName = 'AssetCard';
