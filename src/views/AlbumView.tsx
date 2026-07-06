import React, {useMemo} from 'react';
import {useAlbumDetails} from '../hooks/useAlbumDetails';
import {groupAssetsByDay} from '../domain/transforms';
import {AssetGridView} from '../components/AssetGridView';

interface AlbumViewProps {
	albumId: string;
	onBack: () => void;
	contentWidth: number;
}

const AlbumView: React.FC<AlbumViewProps> = ({albumId, onBack, contentWidth}) => {
	const {data: album, isLoading, error} = useAlbumDetails(albumId);

	const loadedGroups = useMemo(() => groupAssetsByDay(album?.assets ?? [], album?.order), [album]);

	return (
		<AssetGridView
			title={album?.albumName ?? ''}
			subtitle={album ? `${album.assetCount} items` : ''}
			groups={loadedGroups}
			isLoading={isLoading}
			error={error}
			isEmpty={!album}
			spotlightId="album-grid"
			onBack={onBack}
			contentWidth={contentWidth}
		/>
	);
};

export default AlbumView;
