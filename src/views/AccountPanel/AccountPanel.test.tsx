import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {AuthMethod} from '../../api/types';
import type {Account} from '../../utils/accountsStore';
import {AccountPanel} from './AccountPanel';

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

jest.mock('@enact/sandstone/TabLayout', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const ReactLib = require('react');
	const TabLayoutMock = ({children}: any) => {
		const tabs = ReactLib.Children.toArray(children);
		const [active, setActive] = ReactLib.useState(0);
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
	return {__esModule: true, default: TabLayoutMock, Tab};
});

jest.mock('@enact/sandstone/BodyText', () => ({
	__esModule: true,
	default: ({children}: any) => <p>{children}</p>,
}));

jest.mock('@enact/sandstone/Icon', () => ({
	__esModule: true,
	default: ({children}: any) => <i>{children}</i>,
}));

const acc: Account = {
	id: 'a',
	baseUrl: 'http://x',
	method: AuthMethod.USER_CREDENTIALS,
	email: 'me@example.com',
	addedAt: 1,
};

const noopHandlers = {
	onSwitch: () => {},
	onSetDefault: () => {},
	onRemove: () => {},
	onAddAccount: async () => ({success: true as const}),
	onCloseOverlay: () => {},
};

describe('AccountPanel', () => {
	test('first-launch shows the welcome screen', () => {
		render(
			<AccountPanel
				mode="first-launch"
				accounts={[]}
				activeAccountId={null}
				defaultAccountId={null}
				{...noopHandlers}
			/>,
		);
		expect(screen.getByText(/Welcome to Immich/i)).toBeTruthy();
	});

	test('overlay grid shows cards + add', () => {
		render(
			<AccountPanel
				mode="overlay"
				accounts={[acc]}
				activeAccountId="a"
				defaultAccountId={null}
				{...noopHandlers}
			/>,
		);
		expect(screen.getByText('me@example.com')).toBeTruthy();
		expect(screen.getByText(/Add account/i)).toBeTruthy();
	});

	test('clicking Add tile swaps to the form view', () => {
		render(
			<AccountPanel
				mode="overlay"
				accounts={[acc]}
				activeAccountId="a"
				defaultAccountId={null}
				{...noopHandlers}
			/>,
		);
		fireEvent.click(screen.getByText(/Add account/i).closest('[role="button"]')!);
		expect(screen.getByRole('button', {name: /Connect/i})).toBeTruthy();
	});

	test('form Back returns to grid when accounts.length >= 1', () => {
		render(
			<AccountPanel
				mode="overlay"
				accounts={[acc]}
				activeAccountId="a"
				defaultAccountId={null}
				{...noopHandlers}
			/>,
		);
		fireEvent.click(screen.getByText(/Add account/i).closest('[role="button"]')!);
		fireEvent.click(screen.getByRole('button', {name: /Back/i}));
		expect(screen.queryByRole('button', {name: /Connect/i})).toBeNull();
	});
});
