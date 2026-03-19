import React, {useEffect, useState} from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import {SIDEBAR_COLLAPSED_WIDTH} from '../utils/constants';
import NavigationRail from '../components/NavigationRail/NavigationRail';
import MainPanel from './MainPanel';
import AlbumsPanel from './AlbumsPanel';
import SearchPanel from './SearchPanel';
import type {View} from '../types/navigation';
import type {ImmichAPI} from '../api/immich';
import css from './AppLayout.module.less';

interface AppLayoutProps {
	api: ImmichAPI;
	onSignOut: () => void;
}

const ViewContainer = SpotlightContainerDecorator(
	{enterTo: 'last-focused'},
	'div' as unknown as React.ComponentType<React.HTMLAttributes<HTMLDivElement>>
);

const AppLayout: React.FC<AppLayoutProps> = ({api, onSignOut}) => {
	const [activeView, setActiveView] = useState<View>('photos');
	const [photosScrollIndex, setPhotosScrollIndex] = useState<number | null>(null);
	const [contentWidth, setContentWidth] = useState(window.innerWidth - SIDEBAR_COLLAPSED_WIDTH);

	useEffect(() => {
		const handleResize = () => setContentWidth(window.innerWidth - SIDEBAR_COLLAPSED_WIDTH);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return (
		<div className={css.layout}>
			<NavigationRail
				activeView={activeView}
				onNavigate={setActiveView}
				onSignOut={onSignOut}
			/>
			<ViewContainer className={css.viewContainer}>
				{activeView === 'photos' && (
					<MainPanel
						api={api}
						contentWidth={contentWidth}
						initialScrollIndex={photosScrollIndex}
						onScrollIndexChange={setPhotosScrollIndex}
					/>
				)}
				{activeView === 'albums' && <AlbumsPanel />}
				{activeView === 'search' && <SearchPanel />}
			</ViewContainer>
		</div>
	);
};

export default AppLayout;
