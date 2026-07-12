import React from 'react';
import {SpottableDiv} from '../utils/spotlight';
import css from './ThumbnailCard.module.less';

interface ThumbnailCardProps {
	thumbnailUrl: string | null;
	title: string;
	secondaryLine?: React.ReactNode;
	onClick: () => void;
}

/** Square poster card, focusable via D-pad. */
export const ThumbnailCard: React.FC<ThumbnailCardProps> = React.memo(({thumbnailUrl, title, secondaryLine, onClick}) => (
	<SpottableDiv className={css.card} onClick={onClick}>
		{thumbnailUrl
			? <img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />
			: <div className={css.placeholder} />
		}
		<div className={css.info}>
			<span className={css.title}>{title}</span>
			{secondaryLine && <span className={css.secondary}>{secondaryLine}</span>}
		</div>
	</SpottableDiv>
));

ThumbnailCard.displayName = 'ThumbnailCard';
