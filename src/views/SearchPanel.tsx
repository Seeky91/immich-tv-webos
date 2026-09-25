import React, {useCallback, useMemo, useState} from 'react';
import Input from '@enact/sandstone/Input';
import {PeopleRibbon} from '../components/PeopleRibbon/PeopleRibbon';
import {QueryStateView} from '../components/QueryStateView';
import {TimelineGrid} from '../components/TimelineGrid/TimelineGrid';
import {usePeople} from '../hooks/usePeople';
import {useSearch} from '../hooks/useSearch';
import {useTimeline} from '../hooks/useTimeline';
import type {SearchQuery} from '../hooks/useSearch';
import {createSpotlightContainer} from '../utils/spotlight';
import type {RoutePanelProps} from '../types/navigation';
import css from './SearchPanel.module.less';

const Container = createSpotlightContainer({enterTo: 'default-element'});

type ActiveSearch = SearchQuery | {type: 'person'; value: string};

const PersonResults: React.FC<{personId: string; contentWidth: number}> = ({personId, contentWidth}) => {
	const scope = useMemo(() => ({personId}), [personId]);
	const {timeline, isLoading, isError, error} = useTimeline(scope);
	return (
		<QueryStateView
			isLoading={isLoading}
			error={isError ? error : null}
			isEmpty={timeline.allBuckets.length === 0}
			loadingText="Searching…"
			emptyText="No results found."
		>
			<TimelineGrid timeline={timeline} contentWidth={contentWidth} />
		</QueryStateView>
	);
};

const SearchPanel: React.FC<RoutePanelProps> = ({contentWidth}) => {
	const [activeQuery, setActiveQuery] = useState<ActiveSearch | null>(null);
	const [inputValue, setInputValue] = useState('');

	const {data: people = [], isLoading: isPeopleLoading} = usePeople();
	const textQuery = activeQuery?.type === 'person' ? null : activeQuery;
	const {groups, isLoading: isSearchLoading, error} = useSearch(textQuery);

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
				{selectedPersonId ? (
					<PersonResults key={selectedPersonId} personId={selectedPersonId} contentWidth={contentWidth} />
				) : (
					<QueryStateView
						isLoading={isSearchLoading}
						error={error}
						isEmpty={!textQuery || groups.length === 0}
						loadingText="Searching…"
						emptyText={!textQuery ? 'Choose a person or search your photos' : 'No results found.'}
					>
						<TimelineGrid groups={groups} contentWidth={contentWidth} />
					</QueryStateView>
				)}
			</div>
		</Container>
	);
};

export default SearchPanel;
