import React, {useMemo} from 'react';
import {Panel, Header} from '@enact/sandstone/Panels';
import ri from '@enact/ui/resolution';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {useInfiniteTimeline} from '../hooks/useAssets';
import {presentError} from '../utils/presentError';
import {GRID_INSET_RIGHT_PX} from '../utils/constants';
import css from './MainPanel.module.less';

interface MainPanelProps {
	contentWidth: number;
}

const MainPanel: React.FC<MainPanelProps> = ({contentWidth}) => {
	const {data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, allBuckets} = useInfiniteTimeline();

	const loadedGroups = useMemo(() => data?.pages.flatMap((p) => p.groups) ?? [], [data]);

	if (isLoading) {
		return (
			<Panel>
				<Header title="Immich TV" />
				<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
					<p>Loading…</p>
				</div>
			</Panel>
		);
	}

	if (isError) {
		return (
			<Panel>
				<Header title="Immich TV" />
				<div style={{padding: ri.scale(40), textAlign: 'center'}}>
					<h2>Error loading assets</h2>
					<p>{presentError(error)}</p>
				</div>
			</Panel>
		);
	}

	return (
		<Panel className={css.mainPanel}>
			<TimelineGrid
				groups={loadedGroups}
				contentWidth={contentWidth}
				style={{paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
				pagination={{allBuckets, hasNextPage: !!hasNextPage, isFetchingNextPage, fetchNextPage}}
			/>
		</Panel>
	);
};

export default MainPanel;
