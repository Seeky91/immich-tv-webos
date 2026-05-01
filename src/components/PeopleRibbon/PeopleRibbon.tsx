import React, {useCallback} from 'react';
import Scroller from '@enact/sandstone/Scroller';
import ri from '@enact/ui/resolution';
import {SpottableDiv} from '../../utils/spotlight';
import {useRepository} from '../../domain/RepositoryContext';
import type {PhotoRepository} from '../../domain/PhotoRepository';
import type {Person} from '../../domain/types';
import css from './PeopleRibbon.module.less';

interface PeopleRibbonProps {
	people: Person[];
	selectedPersonId: string | null;
	onSelectPerson: (personId: string) => void;
	isLoading: boolean;
}

interface PersonItemProps {
	person: Person;
	repository: PhotoRepository;
	isSelected: boolean;
	onSelect: (personId: string) => void;
}

const PersonItem: React.FC<PersonItemProps> = ({person, repository, isSelected, onSelect}) => {
	const handleClick = useCallback(() => onSelect(person.id), [person.id, onSelect]);
	return (
		<SpottableDiv
			className={`${css.personItem}${isSelected ? ` ${css.selected}` : ''}`}
			onClick={handleClick}
		>
			<img
				src={repository.faceUrl(person.id)}
				className={css.face}
				alt={person.name || 'Unknown person'}
			/>
			<span className={css.name}>{person.name || 'Unknown'}</span>
		</SpottableDiv>
	);
};

const PeopleRibbon: React.FC<PeopleRibbonProps> = ({people, selectedPersonId, onSelectPerson, isLoading}) => {
	const repository = useRepository();
	if (isLoading || people.length === 0) return null;

	return (
		<div className={css.ribbonWrapper}>
			<Scroller direction="horizontal" scrollMode="native" horizontalScrollbar="hidden" style={{height: ri.scale(208)}}>
				<div className={css.ribbon} style={{paddingLeft: ri.scale(8)}}>
					{people.map((person) => (
						<PersonItem
							key={person.id}
							person={person}
							repository={repository}
							isSelected={person.id === selectedPersonId}
							onSelect={onSelectPerson}
						/>
					))}
				</div>
			</Scroller>
		</div>
	);
};

export default PeopleRibbon;
