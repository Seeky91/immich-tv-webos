import React, {useCallback, useRef, useState} from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Icon from '@enact/sandstone/Icon';
import css from './NavigationRail.module.less';

type View = 'photos' | 'albums' | 'search';

interface NavigationRailProps {
	activeView: View;
	onNavigate: (view: View) => void;
	onSignOut: () => void;
}

const NAV_ITEMS: {view: View; icon: string; label: string}[] = [
	{view: 'photos', icon: 'image', label: 'Photos'},
	{view: 'albums', icon: 'folder', label: 'Albums'},
	{view: 'search', icon: 'search', label: 'Search'},
];

const RailContainer = SpotlightContainerDecorator({enterTo: 'last-focused'}, 'div');

const NavigationRail: React.FC<NavigationRailProps> = ({activeView, onNavigate, onSignOut}) => {
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

	const railClass = [css.rail, isExpanded ? css.expanded : ''].filter(Boolean).join(' ');

	const makeNavHandler = useCallback(
		(view: View) => () => onNavigate(view),
		[onNavigate]
	);

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
					onClick={makeNavHandler(view)}
				>
					<Icon>{icon}</Icon>
					<span className={css.label}>{label}</span>
				</button>
			))}
			<div className={css.spacer} />
			<div className={css.divider} />
			<button className={css.navItem} onClick={onSignOut}>
				<Icon>logout</Icon>
				<span className={css.label}>Sign Out</span>
			</button>
		</RailContainer>
	);
};

export default NavigationRail;
