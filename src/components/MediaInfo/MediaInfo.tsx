import React from 'react';
import Icon from '@enact/sandstone/Icon';
import {formatAssetDateTime} from '../../utils/FormattingService';
import type {TimelineAsset} from '../../domain/types';
import css from './MediaInfo.module.less';

export const MediaInfo: React.FC<{asset: TimelineAsset}> = React.memo(({asset}) => {
	const {date, time} = formatAssetDateTime(asset.localDateTime);
	const place = [asset.city, asset.country].filter(Boolean).join(', ');
	return (
		<div className={css.info}>
			<div className={css.date}>{date}</div>
			<div className={css.meta}>
				{time}
				{place && (
					<>
						<span className={css.separator}>•</span>
						<Icon size="tiny" className={css.pin}>
							location
						</Icon>
						{place}
					</>
				)}
			</div>
		</div>
	);
});

MediaInfo.displayName = 'MediaInfo';
