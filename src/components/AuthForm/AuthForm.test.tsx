import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {AuthMethod} from '../../api/types';
import {AuthForm} from './AuthForm';

// Sandstone primitives don't work in jsdom — mock them.
jest.mock('@enact/sandstone/Input', () => ({
	__esModule: true,
	default: ({value, onChange, placeholder, disabled, autoFocus, type}: any) => (
		<input
			value={value ?? ''}
			placeholder={placeholder}
			disabled={disabled}
			autoFocus={autoFocus}
			type={type}
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

jest.mock('@enact/sandstone/BodyText', () => {
	const Comp = ({children, className}: any) => <span className={className}>{children}</span>;
	return {__esModule: true, default: Comp, BodyText: Comp};
});

jest.mock('@enact/sandstone/Icon', () => {
	const Comp = ({children}: any) => <span>{children}</span>;
	return {__esModule: true, default: Comp, Icon: Comp};
});

jest.mock('@enact/sandstone/TabLayout', () => {
	const React = require('react');
	// Simulate real TabLayout: only the active tab's content is shown.
	// Render tab titles as clickable labels; clicking them switches the active tab.
	const TabLayout = ({children}: any) => {
		const tabs = React.Children.toArray(children);
		const [active, setActive] = React.useState(0);
		return (
			<div>
				<div role="tablist">
					{tabs.map((tab: any, i: number) => (
						<button key={i} role="tab" onClick={() => setActive(i)}>
							{tab.props.title}
						</button>
					))}
				</div>
				{tabs[active]}
			</div>
		);
	};
	const Tab = ({children}: any) => <div>{children}</div>;
	return {__esModule: true, default: TabLayout, Tab};
});

describe('AuthForm', () => {
	test('renders both tabs', () => {
		render(<AuthForm initialUrl="" onSubmit={async () => ({success: true})} onBack={() => {}} />);
		expect(screen.getByText(/Email/)).toBeTruthy();
		expect(screen.getByText(/API Key/)).toBeTruthy();
	});

	test('pre-fills URL from initialUrl prop', () => {
		render(<AuthForm initialUrl="http://prefilled" onSubmit={async () => ({success: true})} onBack={() => {}} />);
		expect(screen.getByDisplayValue('http://prefilled')).toBeTruthy();
	});

	test('submitting Email tab calls onSubmit with USER_CREDENTIALS payload', async () => {
		const onSubmit = jest.fn().mockResolvedValue({success: true});
		render(<AuthForm initialUrl="http://x" onSubmit={onSubmit} onBack={() => {}} />);

		fireEvent.change(screen.getByPlaceholderText(/Email/i), {target: {value: 'me@example.com'}});
		fireEvent.change(screen.getByPlaceholderText(/Password/i), {target: {value: 'pw'}});
		fireEvent.click(screen.getByRole('button', {name: /Connect/i}));

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				method: AuthMethod.USER_CREDENTIALS,
				baseUrl: 'http://x',
				email: 'me@example.com',
				password: 'pw',
			}),
		);
	});

	test('Back button triggers onBack only when callback provided', () => {
		const onBack = jest.fn();
		const {rerender} = render(
			<AuthForm initialUrl="" onSubmit={async () => ({success: true})} onBack={onBack} />,
		);
		fireEvent.click(screen.getByRole('button', {name: /Back/i}));
		expect(onBack).toHaveBeenCalled();

		rerender(<AuthForm initialUrl="" onSubmit={async () => ({success: true})} />);
		expect(screen.queryByRole('button', {name: /Back/i})).toBeNull();
	});

	test('shows error returned by onSubmit', async () => {
		const onSubmit = jest.fn().mockResolvedValue({success: false, errorMessage: 'nope'});
		render(<AuthForm initialUrl="http://x" onSubmit={onSubmit} onBack={() => {}} />);
		fireEvent.change(screen.getByPlaceholderText(/Email/i), {target: {value: 'a@b'}});
		fireEvent.change(screen.getByPlaceholderText(/Password/i), {target: {value: 'pw'}});
		fireEvent.click(screen.getByRole('button', {name: /Connect/i}));
		await waitFor(() => expect(screen.getByText('nope')).toBeTruthy());
	});
});
