import React from 'react';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {useTimeline} from '../hooks/useTimeline';
import type {RoutePanelProps} from '../types/navigation';

const MainPanel: React.FC<RoutePanelProps> = ({contentWidth}) => {
	const {timeline, isLoading, isError, error} = useTimeline();

	return (
		<QueryStateView isLoading={isLoading} error={isError ? error : null}>
			<TimelineGrid contentWidth={contentWidth} timeline={timeline} />
		</QueryStateView>
	);
};

export default MainPanel;
