import React, {useCallback, useMemo} from 'react';
import {useRepository} from '../domain/RepositoryContext';
import type {Place} from '../domain/types';
import {ThumbnailCard} from './ThumbnailCard';

interface PlaceCardProps {
	place: Place;
	onSelect?: (city: string) => void;
}

// Spotlight only resolves string ids made of [A-Za-z0-9_-], and city names are free text: every
// other character (underscore included, so the encoding stays reversible) becomes _ + 6 hex digits.
export const placeCardSpotlightId = (city: string): string =>
	`place-card-${city.replace(/[^A-Za-z0-9-]/gu, (char) => '_' + char.codePointAt(0)!.toString(16).padStart(6, '0'))}`;

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
			spotlightId={placeCardSpotlightId(place.city)}
		/>
	);
});

PlaceCard.displayName = 'PlaceCard';
