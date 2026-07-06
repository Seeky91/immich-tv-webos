import React, {useCallback, useMemo} from 'react';
import {SpottableDiv} from '../utils/spotlight';
import {useRepository} from '../domain/RepositoryContext';
import type {Place} from '../domain/types';
import css from './PlaceCard.module.less';

interface PlaceCardProps {
	place: Place;
	onSelect?: (city: string) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = React.memo(({place, onSelect}) => {
	const repository = useRepository();
	const thumbnailUrl = useMemo(
		() => repository.thumbnailUrl(place.thumbnailAssetId),
		[repository, place.thumbnailAssetId]
	);

	const handleClick = useCallback(() => onSelect?.(place.city), [place.city, onSelect]);

	return (
		<SpottableDiv className={css.placeCard} onClick={handleClick}>
			<img src={thumbnailUrl} alt="" className={css.thumbnail} loading="lazy" />
			<div className={css.info}>
				<span className={css.title}>{place.city}</span>
				{place.country && <span className={css.subtitle}>{place.country}</span>}
			</div>
		</SpottableDiv>
	);
});

PlaceCard.displayName = 'PlaceCard';
