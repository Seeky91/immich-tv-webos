import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {AccountActionBar} from './AccountActionBar';

// Sandstone Button doesn't work in jsdom — mock it.
jest.mock('@enact/sandstone/Button', () => ({
	__esModule: true,
	default: ({children, onClick, disabled, 'aria-label': ariaLabel}: any) => (
		<button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
			{children}
		</button>
	),
}));

const noop = () => {};

describe('AccountActionBar', () => {
	test('hides when focusedAccountId is null', () => {
		const {container} = render(
			<AccountActionBar
				focusedAccountId={null}
				activeAccountId="a"
				defaultAccountId={null}
				onSwitch={noop}
				onSetDefault={noop}
				onRemove={noop}
			/>,
		);
		expect(container.querySelector('button')).toBeNull();
	});

	test('on the active card: Switch is not shown, Sign out is present', () => {
		render(
			<AccountActionBar
				focusedAccountId="a"
				activeAccountId="a"
				defaultAccountId={null}
				onSwitch={noop}
				onSetDefault={noop}
				onRemove={noop}
			/>,
		);
		expect(screen.getByRole('button', {name: /Sign out/i})).toBeTruthy();
		expect(screen.queryByRole('button', {name: /Switch/i})).toBeNull();
	});

	test('on a non-active card: Switch and Remove are present and wired', () => {
		const onSwitch = jest.fn();
		const onRemove = jest.fn();
		render(
			<AccountActionBar
				focusedAccountId="b"
				activeAccountId="a"
				defaultAccountId={null}
				onSwitch={onSwitch}
				onSetDefault={noop}
				onRemove={onRemove}
			/>,
		);
		fireEvent.click(screen.getByRole('button', {name: /Switch/i}));
		expect(onSwitch).toHaveBeenCalledWith('b');
		fireEvent.click(screen.getByRole('button', {name: /Remove/i}));
		expect(onRemove).toHaveBeenCalledWith('b');
	});

	test('Set as default is disabled when focused card is already default', () => {
		render(
			<AccountActionBar
				focusedAccountId="a"
				activeAccountId="a"
				defaultAccountId="a"
				onSwitch={noop}
				onSetDefault={noop}
				onRemove={noop}
			/>,
		);
		const btn = screen.getByRole('button', {name: /Set as default/i});
		expect((btn as HTMLButtonElement).disabled).toBe(true);
	});
});
