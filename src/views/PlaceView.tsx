import React, {useMemo} from 'react';
import {useSearch, type SearchQuery} from '../hooks/useSearch';
import {AssetGridView} from '../components/AssetGridView';

interface PlaceViewProps {
	city: string;
	onBack: () => void;
	contentWidth: number;
}

const PlaceView: React.FC<PlaceViewProps> = ({city, onBack, contentWidth}) => {
	const query = useMemo<SearchQuery>(() => ({type: 'city', value: city}), [city]);
	const {groups, isLoading, error} = useSearch(query);

	const assetCount = useMemo(() => groups.reduce((sum, g) => sum + g.count, 0), [groups]);

	return (
		<AssetGridView
			title={city}
			subtitle={`${assetCount} items`}
			groups={groups}
			isLoading={isLoading}
			error={error}
			isEmpty={groups.length === 0}
			emptyText="No photos found for this place."
			spotlightId="place-grid"
			onBack={onBack}
			contentWidth={contentWidth}
		/>
	);
};

export default PlaceView;
