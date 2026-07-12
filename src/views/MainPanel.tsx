import React, {useMemo} from 'react';
import ri from '@enact/ui/resolution';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {useInfiniteTimeline} from '../hooks/useAssets';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import type {RoutePanelProps} from '../types/navigation';

const MainPanel: React.FC<RoutePanelProps> = ({contentWidth}) => {
	const {data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, allBuckets} = useInfiniteTimeline();

	const loadedGroups = useMemo(() => data?.pages.flatMap((p) => p.groups) ?? [], [data]);
	const pagination = useMemo(
		() => ({allBuckets, hasNextPage: !!hasNextPage, isFetchingNextPage, fetchNextPage}),
		[allBuckets, hasNextPage, isFetchingNextPage, fetchNextPage]
	);

	return (
		<QueryStateView isLoading={isLoading} error={isError ? error : null}>
			<TimelineGrid
				groups={loadedGroups}
				contentWidth={contentWidth}
				style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
				pagination={pagination}
			/>
		</QueryStateView>
	);
};

export default MainPanel;
