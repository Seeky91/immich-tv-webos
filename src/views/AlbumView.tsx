import React, {useMemo} from 'react';
import Button from '@enact/sandstone/Button';
import ri from '@enact/ui/resolution';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import {useAlbumDetails} from '../hooks/useAlbumDetails';
import {useWebOSKeys} from '../hooks/useWebOSKeys';
import GroupedTimeline from '../components/GroupedTimeline/GroupedTimeline';
import type {ImmichAPI} from '../api/immich';
import css from './AlbumView.module.less';

const Container = SpotlightContainerDecorator(
	{enterTo: 'default-element'},
	'div' as unknown as React.ComponentType<React.HTMLAttributes<HTMLDivElement>>
);

interface AlbumViewProps {
	albumId: string;
	onBack: () => void;
	api: ImmichAPI;
	contentWidth: number;
}

const AlbumView: React.FC<AlbumViewProps> = ({albumId, onBack, api, contentWidth}) => {
	const {data: album, isLoading, error} = useAlbumDetails(api, albumId);

	useWebOSKeys({onBack});

	const loadedGroups = useMemo(() => api.groupAssetsByDay(album?.assets ?? []), [album, api]);

	if (isLoading) return <div className={css.state}>Loading…</div>;
	if (error) return <div className={css.state}>Failed to load album.</div>;
	if (!album) return null;

	return (
		<Container className={css.view}>
			<div className={css.header} style={{paddingLeft: ri.scale(72)}}>
				<Button icon="arrowlargeleft" size="small" onClick={onBack} data-spotlight-default-element />
				<span className={css.title}>{album.albumName}</span>
				<span className={css.count}>{album.assetCount} items</span>
			</div>
			<div className={css.listContainer}>
				<GroupedTimeline
					groups={loadedGroups}
					api={api}
					contentWidth={contentWidth}
					style={{paddingLeft: ri.scale(72), paddingRight: ri.scale(40)}}
				/>
			</div>
		</Container>
	);
};

export default AlbumView;
