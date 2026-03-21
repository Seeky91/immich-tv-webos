import React, {useCallback} from 'react';
import Scroller from '@enact/sandstone/Scroller';
import Spottable from '@enact/spotlight/Spottable';
import type {SpottableProps} from '@enact/spotlight/Spottable';
import ri from '@enact/ui/resolution';
import type {ImmichAPI} from '../../api/immich';
import type {ImmichPerson} from '../../api/types';
import css from './PeopleRibbon.module.less';

interface PeopleRibbonProps {
	people: ImmichPerson[];
	api: ImmichAPI;
	selectedPersonId: string | null;
	onSelectPerson: (personId: string) => void;
	isLoading: boolean;
}

type SpottableDivProps = React.HTMLAttributes<HTMLDivElement> & SpottableProps;
const SpottableDiv = Spottable('div') as React.ComponentType<SpottableDivProps>;

interface PersonItemProps {
	person: ImmichPerson;
	api: ImmichAPI;
	isSelected: boolean;
	onSelect: (personId: string) => void;
}

const PersonItem: React.FC<PersonItemProps> = ({person, api, isSelected, onSelect}) => {
	const handleClick = useCallback(() => onSelect(person.id), [person.id, onSelect]);
	return (
		<SpottableDiv
			className={`${css.personItem}${isSelected ? ` ${css.selected}` : ''}`}
			onClick={handleClick}
		>
			<img
				src={api.getFaceThumbnailUrl(person.id)}
				className={css.face}
				alt={person.name || 'Unknown person'}
			/>
			<span className={css.name}>{person.name || 'Unknown'}</span>
		</SpottableDiv>
	);
};

const PeopleRibbon: React.FC<PeopleRibbonProps> = ({people, api, selectedPersonId, onSelectPerson, isLoading}) => {
	if (isLoading || people.length === 0) return null;

	return (
		<Scroller direction="horizontal" scrollMode="native" horizontalScrollbar="hidden" style={{height: ri.scale(240), flexShrink: 0}}>
			<div className={css.ribbon} style={{paddingLeft: ri.scale(72)}}>
				{people.map((person) => (
					<PersonItem
						key={person.id}
						person={person}
						api={api}
						isSelected={person.id === selectedPersonId}
						onSelect={onSelectPerson}
					/>
				))}
			</div>
		</Scroller>
	);
};

export default PeopleRibbon;
