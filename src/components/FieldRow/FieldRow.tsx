import React, {useCallback} from 'react';
import Input from '@enact/sandstone/Input';
import {SpottableDiv} from '../../utils/spotlight';
import css from './FieldRow.module.less';

interface FieldRowProps {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
	type?: 'text' | 'password';
	disabled?: boolean;
	autoFocus?: boolean;
	clearLabel?: string;
}

// Sandstone Input is button-like and self-sizes to its content. We force a fixed
// width on the outer wrapper via inline style so URL, Email, Password and API Key
// all render at the same width regardless of value length.
const INPUT_STYLE: React.CSSProperties = {width: '26rem', minWidth: '26rem'};

export const FieldRow: React.FC<FieldRowProps> = ({
	value,
	onChange,
	placeholder,
	type,
	disabled,
	autoFocus,
	clearLabel = 'Clear',
}) => {
	// Sandstone Input emits a custom {value} payload (not a standard React event).
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleChange = useCallback((e: any) => onChange(e.value as string), [onChange]);
	const handleClear = useCallback(() => onChange(''), [onChange]);

	return (
		<div className={css.row}>
			<Input
				size="large"
				style={INPUT_STYLE}
				value={value}
				placeholder={placeholder}
				type={type}
				onChange={handleChange}
				disabled={disabled}
				autoFocus={autoFocus}
			/>
			<SpottableDiv
				role="button"
				aria-label={clearLabel}
				className={css.clear}
				onClick={handleClear}
			>
				×
			</SpottableDiv>
		</div>
	);
};
