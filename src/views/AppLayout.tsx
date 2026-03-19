import React, {useCallback, useEffect, useState} from 'react';
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

const ViewContainer = SpotlightContainerDecorator({enterTo: 'last-focused'}, 'div');

const AppLayout: React.FC<AppLayoutProps> = ({api, onSignOut}) => {
	const [activeView, setActiveView] = useState<View>('photos');
	const [photosScrollIndex, setPhotosScrollIndex] = useState<number | null>(null);
	const [contentWidth, setContentWidth] = useState(
		typeof window !== 'undefined' ? window.innerWidth - SIDEBAR_COLLAPSED_WIDTH : 1920 - SIDEBAR_COLLAPSED_WIDTH
	);

	useEffect(() => {
		const handleResize = () => setContentWidth(window.innerWidth - SIDEBAR_COLLAPSED_WIDTH);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const handleNavigate = useCallback((view: View) => {
		setActiveView(view);
	}, []);

	const handleScrollIndexChange = useCallback((index: number) => {
		setPhotosScrollIndex(index);
	}, []);

	return (
		<div className={css.layout}>
			<NavigationRail
				activeView={activeView}
				onNavigate={handleNavigate}
				onSignOut={onSignOut}
			/>
			<ViewContainer className={css.viewContainer}>
				{activeView === 'photos' && (
					// @ts-expect-error — contentWidth/initialScrollIndex/onScrollIndexChange added in Task 4
					<MainPanel
						api={api}
						contentWidth={contentWidth}
						initialScrollIndex={photosScrollIndex}
						onScrollIndexChange={handleScrollIndexChange}
					/>
				)}
				{activeView === 'albums' && <AlbumsPanel />}
				{activeView === 'search' && <SearchPanel />}
			</ViewContainer>
		</div>
	);
};

export default AppLayout;
