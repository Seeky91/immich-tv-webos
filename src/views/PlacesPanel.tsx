import React, {useCallback, useState} from 'react';
import Scroller from '@enact/sandstone/Scroller';
import {PlaceCard} from '../components/PlaceCard';
import {QueryStateView} from '../components/QueryStateView';
import PlaceView from './PlaceView';
import {usePlaces} from '../hooks/usePlaces';
import type {RoutePanelProps} from '../types/navigation';
import css from './PlacesPanel.module.less';

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
			<Scroller direction="vertical" scrollMode="native" verticalScrollbar="visible" className={css.scroller}>
				<div className={css.grid}>
					{places?.map((place) => (
						<PlaceCard key={place.city} place={place} onSelect={handleSelectPlace} />
					))}
				</div>
			</Scroller>
		</QueryStateView>
	);
};

export default PlacesPanel;
