import React, {useCallback, useMemo} from 'react';
import {useRepository} from '../domain/RepositoryContext';
import type {Place} from '../domain/types';
import {ThumbnailCard} from './ThumbnailCard';

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
		<ThumbnailCard
			thumbnailUrl={thumbnailUrl}
			title={place.city}
			secondaryLine={place.country}
			onClick={handleClick}
		/>
	);
});

PlaceCard.displayName = 'PlaceCard';
