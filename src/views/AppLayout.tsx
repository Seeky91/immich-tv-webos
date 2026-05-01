import React, {useEffect, useState} from 'react';
import {SIDEBAR_COLLAPSED_WIDTH} from '../utils/constants';
import {createSpotlightContainer} from '../utils/spotlight';
import NavigationRail from '../components/NavigationRail/NavigationRail';
import MainPanel from './MainPanel';
import AlbumsPanel from './AlbumsPanel';
import SearchPanel from './SearchPanel';
import type {View} from '../types/navigation';
import css from './AppLayout.module.less';

interface AppLayoutProps {
	onSignOut: () => void;
}

const ViewContainer = createSpotlightContainer({enterTo: 'last-focused'});

const AppLayout: React.FC<AppLayoutProps> = ({onSignOut}) => {
	const [activeView, setActiveView] = useState<View>('photos');
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
				<div className={activeView === 'photos' ? css.panelActive : css.panelHidden}>
					<MainPanel contentWidth={contentWidth} />
				</div>
				{activeView === 'albums' && (
					<div className={css.panelActive}>
						<AlbumsPanel contentWidth={contentWidth} />
					</div>
				)}
				{activeView === 'search' && (
					<div className={css.panelActive}>
						<SearchPanel contentWidth={contentWidth} />
					</div>
				)}
			</ViewContainer>
		</div>
	);
};

export default AppLayout;
