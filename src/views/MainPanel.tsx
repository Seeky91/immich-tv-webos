import React, {useMemo} from 'react';
import {Panel} from '@enact/sandstone/Panels';
import ri from '@enact/ui/resolution';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {useInfiniteTimeline} from '../hooks/useAssets';
import {GRID_INSET_RIGHT_PX} from '../utils/constants';
import css from './MainPanel.module.less';

interface MainPanelProps {
	contentWidth: number;
}

const MainPanel: React.FC<MainPanelProps> = ({contentWidth}) => {
	const {data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, allBuckets} = useInfiniteTimeline();

	const loadedGroups = useMemo(() => data?.pages.flatMap((p) => p.groups) ?? [], [data]);

	return (
		<Panel className={css.mainPanel}>
			<QueryStateView isLoading={isLoading} error={isError ? error : null} className={css.state}>
				<TimelineGrid
					groups={loadedGroups}
					contentWidth={contentWidth}
					style={{paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
					pagination={{allBuckets, hasNextPage: !!hasNextPage, isFetchingNextPage, fetchNextPage}}
				/>
			</QueryStateView>
		</Panel>
	);
};

export default MainPanel;
