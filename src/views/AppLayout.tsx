import React, {useEffect, useState} from 'react';
import {SIDEBAR_WIDTH} from '../utils/constants';
import {createSpotlightContainer} from '../utils/spotlight';
import {NavigationRail} from '../components/NavigationRail/NavigationRail';
import MainPanel from './MainPanel';
import AlbumsPanel from './AlbumsPanel';
import PlacesPanel from './PlacesPanel';
import SearchPanel from './SearchPanel';
import type {View} from '../types/navigation';
import css from './AppLayout.module.less';

interface AppLayoutProps {
	onOpenAccount: () => void;
	accountLetter: string;
	accountGradient: string;
}

const ViewContainer = createSpotlightContainer({enterTo: 'last-focused'});

const AppLayout: React.FC<AppLayoutProps> = ({onOpenAccount, accountLetter, accountGradient}) => {
	const [activeView, setActiveView] = useState<View>('photos');
	const [contentWidth, setContentWidth] = useState(window.innerWidth - SIDEBAR_WIDTH);

	useEffect(() => {
		const handleResize = () => setContentWidth(window.innerWidth - SIDEBAR_WIDTH);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return (
		<div className={css.layout}>
			<NavigationRail
				activeView={activeView}
				onNavigate={setActiveView}
				onOpenAccount={onOpenAccount}
				accountLetter={accountLetter}
				accountGradient={accountGradient}
			/>
			{/*
				MainPanel reste mounté (CSS-hidden) pour préserver la position de scroll de la VirtualList
				du timeline. Le cache TanStack survit déjà via QueryClientProvider en haut, donc l'unmount
				ne perdrait que la position scroll. Albums/Search réinitialisent leur navigation interne à
				chaque retour, ce qui est désiré côté UX.
			*/}
			<ViewContainer className={css.viewContainer}>
				<div className={activeView === 'photos' ? css.panelActive : css.panelHidden}>
					<MainPanel contentWidth={contentWidth} />
				</div>
				{activeView === 'albums' && (
					<div className={css.panelActive}>
						<AlbumsPanel contentWidth={contentWidth} />
					</div>
				)}
				{activeView === 'places' && (
					<div className={css.panelActive}>
						<PlacesPanel contentWidth={contentWidth} />
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
