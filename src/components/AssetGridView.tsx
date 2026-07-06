import React, {useEffect} from 'react';
import Spotlight from '@enact/spotlight';
import Button from '@enact/sandstone/Button';
import ri from '@enact/ui/resolution';
import {useWebOSKeys} from '../hooks/useWebOSKeys';
import {createSpotlightContainer} from '../utils/spotlight';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import {TimelineGrid} from './TimelineGrid/TimelineGrid';
import {QueryStateView} from './QueryStateView';
import type {DayGroup} from '../domain/types';
import css from './AssetGridView.module.less';

const Container = createSpotlightContainer({enterTo: 'last-focused'});
const GridContainer = createSpotlightContainer({enterTo: 'last-focused'});

interface AssetGridViewProps {
	title: string;
	subtitle: string;
	groups: DayGroup[];
	isLoading: boolean;
	error: unknown;
	isEmpty: boolean;
	emptyText?: string;
	spotlightId: string;
	onBack: () => void;
	contentWidth: number;
}

/** Shared detail layout for asset collections (album, place): back header + day-grouped grid. */
export const AssetGridView: React.FC<AssetGridViewProps> = ({
	title,
	subtitle,
	groups,
	isLoading,
	error,
	isEmpty,
	emptyText = '',
	spotlightId,
	onBack,
	contentWidth,
}) => {
	useWebOSKeys({onBack});

	// When assets finish loading, move focus into the photo grid so the user can start
	// navigating photos right away. The back button remains reachable via remote Back (above)
	// and via D-pad up from the top row. rAF defers focus to after VirtualList paints its first
	// items — calling Spotlight.focus before they mount silently no-ops.
	useEffect(() => {
		if (!groups.length) return;
		const raf = requestAnimationFrame(() => Spotlight.focus(spotlightId));
		return () => cancelAnimationFrame(raf);
	}, [groups, spotlightId]);

	return (
		<QueryStateView
			isLoading={isLoading}
			error={error}
			isEmpty={isEmpty}
			loadingText="Loading…"
			emptyText={emptyText}
		>
			<Container className={css.view}>
				<div className={css.header} style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX)}}>
					<Button icon="arrowlargeleft" size="small" onClick={onBack} />
					<span className={css.title}>{title}</span>
					<span className={css.count}>{subtitle}</span>
				</div>
				<GridContainer spotlightId={spotlightId} className={css.listContainer}>
					<TimelineGrid
						groups={groups}
						contentWidth={contentWidth}
						style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
					/>
				</GridContainer>
			</Container>
		</QueryStateView>
	);
};

AssetGridView.displayName = 'AssetGridView';
