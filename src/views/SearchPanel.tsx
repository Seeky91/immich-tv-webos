import React, {useCallback, useState} from 'react';
import Input from '@enact/sandstone/Input';
import Spinner from '@enact/sandstone/Spinner';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import ri from '@enact/ui/resolution';
import PeopleRibbon from '../components/PeopleRibbon/PeopleRibbon';
import GroupedTimeline from '../components/GroupedTimeline/GroupedTimeline';
import {useImmichPeople} from '../hooks/useImmichPeople';
import {useImmichSearchResults} from '../hooks/useImmichSearchResults';
import type {SearchQuery} from '../hooks/useImmichSearchResults';
import type {ImmichAPI} from '../api/immich';
import css from './SearchPanel.module.less';

interface SearchPanelProps {
	api: ImmichAPI;
	contentWidth: number;
}

const Container = SpotlightContainerDecorator(
	{enterTo: 'default-element'},
	'div' as unknown as React.ComponentType<React.HTMLAttributes<HTMLDivElement>>
);

const SearchPanel: React.FC<SearchPanelProps> = ({api, contentWidth}) => {
	const [activeQuery, setActiveQuery] = useState<SearchQuery | null>(null);
	const [inputValue, setInputValue] = useState('');

	const {data: people = [], isLoading: isPeopleLoading} = useImmichPeople(api);
	const {groups, isLoading: isSearchLoading, error} = useImmichSearchResults(api, activeQuery);

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
			<span className={css.panelTitle}>Search</span>
			<div className={css.controls} style={{paddingLeft: ri.scale(72)}}>
				{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
				<Input
					placeholder="Smart search…"
					value={inputValue}
					onChange={handleInputChange}
					size="large"
					data-spotlight-default-element
					className={css.searchInput}
					{...({onComplete: handleTextSearch} as any)}
				/>
			</div>
			<PeopleRibbon
				people={people}
				api={api}
				selectedPersonId={selectedPersonId}
				onSelectPerson={handlePersonSearch}
				isLoading={isPeopleLoading}
			/>
			<div className={css.results}>
				{isSearchLoading && <Spinner component="div" centered transparent />}
				{!isSearchLoading && !!error && <div className={css.state}>Search failed.</div>}
				{!activeQuery && !isSearchLoading && (
					<div className={css.emptyState}>Tap a face or type to search</div>
				)}
				{activeQuery && !isSearchLoading && !error && groups.length === 0 && (
					<div className={css.state}>No results found.</div>
				)}
				{groups.length > 0 && (
					<GroupedTimeline
						groups={groups}
						api={api}
						contentWidth={contentWidth}
						style={{paddingLeft: ri.scale(72), paddingRight: ri.scale(40)}}
					/>
				)}
			</div>
		</Container>
	);
};

export default SearchPanel;
