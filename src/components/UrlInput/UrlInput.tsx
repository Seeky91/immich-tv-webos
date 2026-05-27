import React, {useEffect, useMemo, useRef} from 'react';
import {SpottableDiv} from '../../utils/spotlight';
import {FieldRow} from '../FieldRow/FieldRow';
import css from './UrlInput.module.less';

const SHORTCUTS = ['http://', 'https://', '.local', '.com', ':2283', ':30041'] as const;

interface UrlInputProps {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
	disabled?: boolean;
	autoFocus?: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({value, onChange, placeholder, disabled, autoFocus}) => {
	const valueRef = useRef(value);
	useEffect(() => {
		valueRef.current = value;
	});

	const chipHandlers = useMemo(
		() =>
			Object.fromEntries(
				SHORTCUTS.map(s => [s, () => onChange(valueRef.current + s)]),
			) as Record<(typeof SHORTCUTS)[number], () => void>,
		[onChange],
	);

	return (
		<div className={css.wrap}>
			<FieldRow
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				disabled={disabled}
				autoFocus={autoFocus}
				clearLabel="Clear URL"
			/>
			<div className={css.chips} role="group" aria-label="URL shortcuts">
				{SHORTCUTS.map(s => (
					<SpottableDiv
						key={s}
						role="button"
						className={css.chip}
						onClick={chipHandlers[s]}
					>
						{s}
					</SpottableDiv>
				))}
			</div>
		</div>
	);
};
