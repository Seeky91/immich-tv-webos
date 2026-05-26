import React, {useCallback, useMemo, useRef} from 'react';
import Input from '@enact/sandstone/Input';
import Button from '@enact/sandstone/Button';
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
			<div className={css.inputRow}>
				<Input
					size="large"
					value={value}
					onChange={handleChange}
					placeholder={placeholder}
					disabled={disabled}
					autoFocus={autoFocus}
				/>
				<Button
					className={css.clearBtn}
					aria-label="Clear"
					size="small"
					icon="closex"
					onClick={handleClear}
					disabled={!value || disabled}
				/>
			</div>
			<div className={css.chips}>
				{SHORTCUTS.map(s => (
					<Button
						key={s}
						className={css.chip}
						size="small"
						onClick={chipHandlers[s]}
						disabled={disabled}
					>
						{s}
					</Button>
				))}
			</div>
		</div>
	);
};
