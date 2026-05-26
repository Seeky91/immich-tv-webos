import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {UrlInput} from './UrlInput';

jest.mock('@enact/sandstone/Input', () => ({
	__esModule: true,
	default: ({value, onChange, placeholder, disabled, autoFocus}: any) => (
		<input
			value={value}
			placeholder={placeholder}
			disabled={disabled}
			autoFocus={autoFocus}
			onChange={e => onChange?.({value: e.target.value})}
		/>
	),
}));

jest.mock('@enact/sandstone/Button', () => ({
	__esModule: true,
	default: ({children, onClick, disabled, 'aria-label': ariaLabel}: any) => (
		<button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
			{children}
		</button>
	),
}));

describe('UrlInput', () => {
	test('renders the value', () => {
		render(<UrlInput value="http://x" onChange={() => {}} />);
		expect(screen.getByDisplayValue('http://x')).toBeTruthy();
	});

	test('clear button calls onChange with empty string', () => {
		const onChange = jest.fn();
		render(<UrlInput value="something" onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Clear'));
		expect(onChange).toHaveBeenCalledWith('');
	});

	test('chip clicks append their text', () => {
		const onChange = jest.fn();
		render(<UrlInput value="http://x" onChange={onChange} />);
		fireEvent.click(screen.getByText(':2283'));
		expect(onChange).toHaveBeenCalledWith('http://x:2283');
	});

	test('renders all chip shortcuts', () => {
		render(<UrlInput value="" onChange={() => {}} />);
		['http://', 'https://', '.local', '.com', ':2283', ':30041'].forEach(chip => {
			expect(screen.getByText(chip)).toBeTruthy();
		});
	});
});
