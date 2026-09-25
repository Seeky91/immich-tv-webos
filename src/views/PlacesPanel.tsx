import React, {useCallback, useState} from 'react';
import {PlaceCard} from '../components/PlaceCard';
import {CollectionGrid} from '../components/CollectionGrid/CollectionGrid';
import {QueryStateView} from '../components/QueryStateView';
import PlaceView from './PlaceView';
import {usePlaces} from '../hooks/usePlaces';
import type {RoutePanelProps} from '../types/navigation';
import {formatCount} from '../utils/FormattingService';

const PlacesPanel: React.FC<RoutePanelProps> = ({contentWidth}) => {
	const [selectedCity, setSelectedCity] = useState<string | null>(null);
	const {data: places, isLoading, error} = usePlaces();

	const handleSelectPlace = useCallback((city: string) => {
		setSelectedCity(city);
	}, []);

	const handleBack = useCallback(() => setSelectedCity(null), []);

	if (selectedCity) {
		return <PlaceView city={selectedCity} onBack={handleBack} contentWidth={contentWidth} />;
	}

	return (
		<QueryStateView
			isLoading={isLoading}
			error={error}
			isEmpty={!places?.length}
			loadingText="Loading places…"
			emptyText="No places found. Photos need location data to appear here."
		>
			<CollectionGrid title="Places" subtitle={places ? formatCount(places.length, 'place') : undefined}>
				{places?.map((place) => (
					<PlaceCard key={place.city} place={place} onSelect={handleSelectPlace} />
				))}
			</CollectionGrid>
		</QueryStateView>
	);
};

export default PlacesPanel;
