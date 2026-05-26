import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {AuthMethod} from '../../api/types';
import type {Account} from '../../utils/accountsStore';
import {AccountCard} from './AccountCard';

const acc: Account = {
	id: 'a',
	baseUrl: 'https://immich.home.local',
	method: AuthMethod.USER_CREDENTIALS,
	email: 'me@example.com',
	addedAt: 1,
};

describe('AccountCard', () => {
	test('renders the derived label and baseUrl', () => {
		render(<AccountCard account={acc} isActive={false} isDefault={false} onSelect={() => {}} />);
		expect(screen.getByText('me@example.com')).toBeTruthy();
		expect(screen.getByText('immich.home.local')).toBeTruthy();
	});

	test('shows DEFAULT badge when isDefault', () => {
		render(<AccountCard account={acc} isActive={false} isDefault={true} onSelect={() => {}} />);
		expect(screen.getByText('DEFAULT')).toBeTruthy();
	});

	test('clicking the card calls onSelect', () => {
		const onSelect = jest.fn();
		render(<AccountCard account={acc} isActive={false} isDefault={false} onSelect={onSelect} />);
		fireEvent.click(screen.getByText('me@example.com').closest('button')!);
		expect(onSelect).toHaveBeenCalledWith('a');
	});
});
