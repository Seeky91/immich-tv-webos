import React, {useCallback, useEffect, useRef} from 'react';
import Spotlight from '@enact/spotlight';
import Button from '@enact/sandstone/Button';
import ri from '@enact/ui/resolution';
import {useWebOSKeys} from '../hooks/useWebOSKeys';
import {createSpotlightContainer} from '../utils/spotlight';
import {GRID_INSET_LEFT_PX} from '../utils/constants';
import {TimelineGrid, type TimelineGridHandle, type TimelineGridTimeline} from './TimelineGrid/TimelineGrid';
import {QueryStateView} from './QueryStateView';
import type {DayGroup} from '../domain/types';
import css from './AssetGridView.module.less';

const Container = createSpotlightContainer({enterTo: 'last-focused'});
const GridContainer = createSpotlightContainer({enterTo: 'last-focused'});

interface AssetGridViewProps {
	title: string;
	subtitle: string;
	groups?: DayGroup[];
	timeline?: TimelineGridTimeline;
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
	timeline,
	isLoading,
	error,
	isEmpty,
	emptyText = '',
	spotlightId,
	onBack,
	contentWidth,
}) => {
	useWebOSKeys({onBack});
	const gridRef = useRef<TimelineGridHandle>(null);
	const startSlideshow = useCallback(() => gridRef.current?.startSlideshow(), []);

	// When assets finish loading, move focus into the photo grid so the user can start
	// navigating photos right away. The back button remains reachable via remote Back (above)
	// and via D-pad up from the top row. rAF defers focus to after VirtualList paints its first
	// items — calling Spotlight.focus before they mount silently no-ops. Keyed on a boolean so
	// later month loads don't steal focus mid-scroll.
	const hasContent = timeline ? timeline.loadedMonths.size > 0 : !!groups?.length;
	useEffect(() => {
		if (!hasContent) return;
		const raf = requestAnimationFrame(() => Spotlight.focus(spotlightId));
		return () => cancelAnimationFrame(raf);
	}, [hasContent, spotlightId]);

	// Empty or failed collections have no grid to land on: rest focus on the back button.
	const backSpotlightId = `${spotlightId}-back`;
	const hasNothingToShow = !isLoading && (!!error || isEmpty);
	useEffect(() => {
		if (!hasNothingToShow) return;
		const raf = requestAnimationFrame(() => Spotlight.focus(backSpotlightId));
		return () => cancelAnimationFrame(raf);
	}, [hasNothingToShow, backSpotlightId]);

	return (
		<Container className={css.view}>
			<div className={css.header} style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX)}}>
				<div className={css.back}>
					<Button icon="arrowlargeleft" size="small" backgroundOpacity="transparent" spotlightId={backSpotlightId} onClick={onBack} />
				</div>
				<div className={css.heading}>
					<span className={css.title}>{title}</span>
					{subtitle && !isLoading && <span className={css.count}>{subtitle}</span>}
				</div>
				{hasContent && (
					<Button icon="play" size="small" backgroundOpacity="transparent" onClick={startSlideshow}>
						Slideshow
					</Button>
				)}
			</div>
			<GridContainer spotlightId={spotlightId} className={css.listContainer}>
				<QueryStateView isLoading={isLoading} error={error} isEmpty={isEmpty} loadingText="Loading…" emptyText={emptyText}>
					<TimelineGrid ref={gridRef} groups={groups} timeline={timeline} contentWidth={contentWidth} />
				</QueryStateView>
			</GridContainer>
		</Container>
	);
};

AssetGridView.displayName = 'AssetGridView';
