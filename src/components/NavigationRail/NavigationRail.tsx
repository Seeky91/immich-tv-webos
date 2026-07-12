import React, {useMemo} from 'react';
import Icon from '@enact/sandstone/Icon';
import {createSpotlightContainer, SpottableButton} from '../../utils/spotlight';
import {NAVIGATION_RAIL_SPOTLIGHT_ID} from '../../utils/constants';
import type {View} from '../../types/navigation';
import css from './NavigationRail.module.less';

interface NavigationRailProps {
	activeView: View;
	onNavigate: (view: View) => void;
	onOpenAccount: () => void;
	accountLetter: string;
	accountGradient: string;
}

const NAV_ITEMS: {view: View; icon: string; label: string}[] = [
	{view: 'photos', icon: 'picture', label: 'Photos'},
	{view: 'albums', icon: 'folder', label: 'Albums'},
	{view: 'places', icon: 'location', label: 'Places'},
	{view: 'search', icon: 'search', label: 'Search'},
];

const RailContainer = createSpotlightContainer({enterTo: 'last-focused'});

export const NavigationRail: React.FC<NavigationRailProps> = React.memo(({activeView, onNavigate, onOpenAccount, accountLetter, accountGradient}) => {
	const navHandlers = useMemo(
		() => Object.fromEntries(NAV_ITEMS.map(({view}) => [view, () => onNavigate(view)])),
		[onNavigate]
	);

	return (
		<RailContainer className={css.rail} spotlightId={NAVIGATION_RAIL_SPOTLIGHT_ID}>
			{NAV_ITEMS.map(({view, icon, label}) => (
				<SpottableButton
					key={view}
					className={[css.navItem, activeView === view ? css.active : ''].filter(Boolean).join(' ')}
					onClick={navHandlers[view]}
				>
					<div className={css.iconContainer}>
						<Icon size="tiny">{icon}</Icon>
					</div>
					<span className={css.label}>{label}</span>
				</SpottableButton>
			))}
			<div className={css.spacer} />
			<div className={css.divider} />
			<SpottableButton className={css.navItem} onClick={onOpenAccount}>
				<div className={css.iconContainer}>
					<span className={css.avatar} style={{background: accountGradient}}>
						{accountLetter}
					</span>
				</div>
				<span className={css.label}>Account</span>
			</SpottableButton>
		</RailContainer>
	);
});

NavigationRail.displayName = 'NavigationRail';
