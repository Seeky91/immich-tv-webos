import React from 'react';
import ri from '@enact/ui/resolution';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {useTimeline} from '../hooks/useTimeline';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import type {RoutePanelProps} from '../types/navigation';

const MainPanel: React.FC<RoutePanelProps> = ({contentWidth}) => {
	const {timeline, isLoading, isError, error} = useTimeline();

	return (
		<QueryStateView isLoading={isLoading} error={isError ? error : null}>
			<TimelineGrid
				contentWidth={contentWidth}
				style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
				timeline={timeline}
			/>
		</QueryStateView>
	);
};

export default MainPanel;
