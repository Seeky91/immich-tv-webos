import React from 'react';
import {render, screen} from '@testing-library/react';
import {spottableClass} from '@enact/spotlight/Spottable';
import {NAVIGATION_RAIL_SPOTLIGHT_ID} from '../../utils/constants';
import {NavigationRail} from './NavigationRail';

jest.mock('@enact/sandstone/Icon', () => ({
	__esModule: true,
	default: ({children}: {children: React.ReactNode}) => <i>{children}</i>,
}));

describe('NavigationRail', () => {
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
		const rail = buttons[0]?.closest(`[data-spotlight-id="${NAVIGATION_RAIL_SPOTLIGHT_ID}"]`);
		expect(rail).not.toBeNull();
		expect(buttons).toHaveLength(5);
		buttons.forEach(button => expect(button.classList.contains(spottableClass)).toBe(true));
	});
});
