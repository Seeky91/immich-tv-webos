import React, {useCallback, useMemo, useRef} from 'react';
import Input from '@enact/sandstone/Input';
import {SpottableDiv} from '../../utils/spotlight';
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
	// Sandstone Input emits a custom {value} payload; the TS type says FormEventHandler
	// (from HTMLProps merge) so we cast to any to match the actual runtime shape.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleChange = useCallback((e: any) => onChange(e.value as string), [onChange]);
	const handleClear = useCallback(() => onChange(''), [onChange]);

	const valueRef = useRef(value);
	valueRef.current = value;

	const chipHandlers = useMemo(
		() =>
			Object.fromEntries(
				SHORTCUTS.map(s => [s, () => onChange(valueRef.current + s)]),
			) as Record<(typeof SHORTCUTS)[number], () => void>,
		[onChange],
	);

	return (
		<div className={css.wrap}>
			<Input
				size="large"
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				disabled={disabled}
				autoFocus={autoFocus}
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
				<SpottableDiv
					role="button"
					aria-label="Clear"
					className={[css.chip, css.chipClear].join(' ')}
					onClick={handleClear}
				>
					×
				</SpottableDiv>
			</div>
		</div>
	);
};
