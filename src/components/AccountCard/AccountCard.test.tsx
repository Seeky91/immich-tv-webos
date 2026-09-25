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

	test('shows the host once when it is already the label', () => {
		const apiKeyAccount: Account = {id: 'b', baseUrl: 'https://immich.home.local', method: AuthMethod.API_KEY, apiKey: 'k', addedAt: 1};
		render(<AccountCard account={apiKeyAccount} isActive={false} isDefault={false} onSelect={() => {}} />);
		expect(screen.getAllByText('immich.home.local')).toHaveLength(1);
	});

	test('shows DEFAULT badge when isDefault', () => {
		render(<AccountCard account={acc} isActive={false} isDefault onSelect={() => {}} />);
		expect(screen.getByText('DEFAULT')).toBeTruthy();
	});

	test('clicking the card calls onSelect', () => {
		const onSelect = jest.fn();
		render(<AccountCard account={acc} isActive={false} isDefault={false} onSelect={onSelect} />);
		fireEvent.click(screen.getByText('me@example.com').closest('[role="button"]')!);
		expect(onSelect).toHaveBeenCalledWith('a');
	});
});
