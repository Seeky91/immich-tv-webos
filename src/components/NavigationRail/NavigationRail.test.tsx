import React from 'react';
import {act, render, screen} from '@testing-library/react';
import Spotlight from '@enact/spotlight';
import {spottableClass} from '@enact/spotlight/Spottable';
import {NAVIGATION_RAIL_ID} from '../../utils/constants';
import {NavigationRail} from './NavigationRail';

jest.mock('@enact/sandstone/Icon', () => ({
	__esModule: true,
	default: ({children}: {children: React.ReactNode}) => <i>{children}</i>,
}));

describe('NavigationRail', () => {
	beforeEach(() => Spotlight.initialize({selector: '.spottable'}));
	afterEach(() => Spotlight.terminate());

	test('registers every button as a Spotlight target', () => {
		render(
			<NavigationRail
				activeView="photos"
				onNavigate={() => {}}
				onOpenAccount={() => {}}
				accountLetter="Q"
				accountGradient="#123456"
			/>
		);

		const buttons = screen.getAllByRole('button');
		const rail = buttons[0]?.closest(`#${NAVIGATION_RAIL_ID}`);
		expect(rail).not.toBeNull();
		expect(buttons).toHaveLength(5);
		buttons.forEach(button => expect(button.classList.contains(spottableClass)).toBe(true));
	});

	test('keeps the replacement rail focusable when an account switch remounts the layout', () => {
		const accountLayout = (account: string) => (
			<div key={account}>
				<NavigationRail activeView="photos" onNavigate={() => {}} onOpenAccount={() => {}} accountLetter={account} accountGradient="#123456" />
			</div>
		);
		const {rerender} = render(accountLayout('Q'));
		for (const account of ['M', 'Q', 'M']) {
			rerender(accountLayout(account));
			act(() => {
				Spotlight.setPointerMode(false);
				expect(Spotlight.focus(`#${NAVIGATION_RAIL_ID}`)).toBe(true);
			});
			expect(document.activeElement).toBe(screen.getByRole('button', {name: /Photos/}));
		}
	});
});
