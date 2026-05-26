import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Icon from '@enact/sandstone/Icon';
import {createSpotlightContainer} from '../../utils/spotlight';
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
	{view: 'search', icon: 'search', label: 'Search'},
];

const RailContainer = createSpotlightContainer({enterTo: 'last-focused'});

export const NavigationRail: React.FC<NavigationRailProps> = React.memo(({activeView, onNavigate, onOpenAccount, accountLetter, accountGradient}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleFocus = useCallback(() => {
		if (blurTimerRef.current !== null) {
			clearTimeout(blurTimerRef.current);
			blurTimerRef.current = null;
		}
		setIsExpanded(true);
	}, []);

	const handleBlur = useCallback(() => {
		blurTimerRef.current = setTimeout(() => {
			setIsExpanded(false);
			blurTimerRef.current = null;
		}, 50);
	}, []);

	useEffect(() => {
		return () => {
			if (blurTimerRef.current !== null) {
				clearTimeout(blurTimerRef.current);
			}
		};
	}, []);

	const navHandlers = useMemo(
		() => Object.fromEntries(NAV_ITEMS.map(({view}) => [view, () => onNavigate(view)])),
		[onNavigate]
	);

	const railClass = [css.rail, isExpanded ? css.expanded : ''].filter(Boolean).join(' ');

	return (
		<RailContainer
			className={railClass}
			onFocusCapture={handleFocus}
			onBlurCapture={handleBlur}
		>
			{NAV_ITEMS.map(({view, icon, label}) => (
				<button
					key={view}
					className={[css.navItem, activeView === view ? css.active : ''].filter(Boolean).join(' ')}
					onClick={navHandlers[view]}
				>
					<div className={css.iconContainer}>
						<Icon>{icon}</Icon>
					</div>
					<span className={css.label}>{label}</span>
				</button>
			))}
			<div className={css.spacer} />
			<div className={css.divider} />
			<button className={css.navItem} onClick={onOpenAccount}>
				<div className={css.iconContainer} style={{background: accountGradient, color: 'white'}}>
					{accountLetter}
				</div>
				<span className={css.label}>Account</span>
			</button>
		</RailContainer>
	);
});

NavigationRail.displayName = 'NavigationRail';
