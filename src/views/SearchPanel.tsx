import React, {useCallback, useState} from 'react';
import Input from '@enact/sandstone/Input';
import ri from '@enact/ui/resolution';
import {PeopleRibbon} from '../components/PeopleRibbon/PeopleRibbon';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {usePeople} from '../hooks/usePeople';
import {useSearch} from '../hooks/useSearch';
import type {SearchQuery} from '../hooks/useSearch';
import {createSpotlightContainer} from '../utils/spotlight';
import {GRID_INSET_LEFT_PX, GRID_INSET_RIGHT_PX} from '../utils/constants';
import css from './SearchPanel.module.less';

interface SearchPanelProps {
	contentWidth: number;
}

const Container = createSpotlightContainer({enterTo: 'default-element'});

const SearchPanel: React.FC<SearchPanelProps> = ({contentWidth}) => {
	const [activeQuery, setActiveQuery] = useState<SearchQuery | null>(null);
	const [inputValue, setInputValue] = useState('');

	const {data: people = [], isLoading: isPeopleLoading} = usePeople();
	const {groups, isLoading: isSearchLoading, error} = useSearch(activeQuery);

	const handleInputChange = useCallback((e: any) => setInputValue(e.value ?? ''), []);

	const handleTextSearch = useCallback((e: any) => {
		const trimmed = (e.value ?? '').trim();
		if (trimmed) {
			setActiveQuery({type: 'smart', value: trimmed});
		}
	}, []);

	const handlePersonSearch = useCallback((personId: string) => {
		setActiveQuery({type: 'person', value: personId});
		setInputValue('');
	}, []);

	const selectedPersonId = activeQuery?.type === 'person' ? activeQuery.value : null;

	return (
		<Container className={css.searchPanel}>
			<div className={css.searchBar}>
				<div className={css.inputWrapper}>
					{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
					<Input
						placeholder="Search…"
						value={inputValue}
						onChange={handleInputChange}
						size="small"
						iconBefore="search"
						data-spotlight-default-element
						className={css.searchInput}
						{...({onComplete: handleTextSearch} as any)}
					/>
				</div>
				<PeopleRibbon
					people={people}
					selectedPersonId={selectedPersonId}
					onSelectPerson={handlePersonSearch}
					isLoading={isPeopleLoading}
				/>
			</div>
			<div className={css.results}>
				<QueryStateView
					isLoading={isSearchLoading}
					error={error}
					isEmpty={!activeQuery || groups.length === 0}
					loadingText="Searching…"
					emptyText={!activeQuery ? 'Tap a face or type to search' : 'No results found.'}
					className={css.state}
				>
					<TimelineGrid
						groups={groups}
						contentWidth={contentWidth}
						style={{paddingLeft: ri.scale(GRID_INSET_LEFT_PX), paddingRight: ri.scale(GRID_INSET_RIGHT_PX)}}
					/>
				</QueryStateView>
			</div>
		</Container>
	);
};

export default SearchPanel;
