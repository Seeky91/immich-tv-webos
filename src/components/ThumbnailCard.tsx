import React from 'react';
import Icon from '@enact/sandstone/Icon';
import {SpottableDiv} from '../utils/spotlight';
import css from './ThumbnailCard.module.less';

interface ThumbnailCardProps {
	thumbnailUrl: string | null;
	title: string;
	secondaryLine?: React.ReactNode;
	onClick: () => void;
}

/** Square poster card with its caption below, focusable via D-pad. */
export const ThumbnailCard: React.FC<ThumbnailCardProps> = React.memo(({thumbnailUrl, title, secondaryLine, onClick}) => (
	<SpottableDiv className={css.card} onClick={onClick}>
		<div className={css.cover}>
			{thumbnailUrl ? (
				<img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />
			) : (
				<Icon size="large" className={css.placeholderIcon}>
					picture
				</Icon>
			)}
		</div>
		<div className={css.title}>{title}</div>
		{secondaryLine && <div className={css.secondary}>{secondaryLine}</div>}
	</SpottableDiv>
));

ThumbnailCard.displayName = 'ThumbnailCard';
