import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {AssetCard} from './AssetCard';
import {RepositoryProvider} from '../domain/RepositoryContext';
import type {PhotoRepository} from '../domain/PhotoRepository';
import type {TimelineAsset} from '../domain/types';

const asset: TimelineAsset = {id: 'video', type: 'VIDEO', ratio: 1.5, localDateTime: '2026-09-19', durationSeconds: 27};
const repository = {
	thumbnailUrl: (id: string) => `/thumbnail/${id}`,
	previewUrl: jest.fn((id: string) => `/preview/${id}`),
} as unknown as PhotoRepository;

const card = (item = asset, onSelect = jest.fn(), repo = repository) => (
	<RepositoryProvider repository={repo}>
		<AssetCard asset={item} index={3} onSelect={onSelect} />
	</RepositoryProvider>
);

describe('AssetCard image failures', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(repository.previewUrl as jest.Mock).mockImplementation((id: string) => `/preview/${id}`);
	});

	test('requests the preview only if the thumbnail fails', () => {
		render(card());
		expect(screen.getByAltText('').getAttribute('src')).toBe('/thumbnail/video');
		expect(repository.previewUrl).not.toHaveBeenCalled();
		fireEvent.error(screen.getByAltText(''));
		expect(screen.getByAltText('').getAttribute('src')).toBe('/preview/video');
		fireEvent.load(screen.getByAltText(''));
		expect(screen.queryByLabelText('Preview unavailable')).toBeNull();
	});

	test('shows an explicit placeholder after both failures and keeps the video selectable', () => {
		const onSelect = jest.fn();
		render(card(asset, onSelect));
		fireEvent.error(screen.getByAltText(''));
		fireEvent.error(screen.getByAltText(''));
		expect(screen.queryByAltText('')).toBeNull();
		fireEvent.click(screen.getByLabelText('Preview unavailable'));
		expect(onSelect).toHaveBeenCalledWith(asset, 3);
		expect(screen.getByText('0:27')).toBeTruthy();
	});

	test('retries from the thumbnail when a card is reused for another asset or account', () => {
		const {rerender} = render(card());
		fireEvent.error(screen.getByAltText(''));
		fireEvent.error(screen.getByAltText(''));
		rerender(card({...asset, id: 'next'}));
		expect(screen.getByAltText('').getAttribute('src')).toBe('/thumbnail/next');
		fireEvent.error(screen.getByAltText(''));
		fireEvent.error(screen.getByAltText(''));
		const otherRepository = {...repository, thumbnailUrl: (id: string) => `/other-account/${id}`};
		rerender(card({...asset, id: 'next'}, jest.fn(), otherRepository));
		expect(screen.getByAltText('').getAttribute('src')).toBe('/other-account/next');
	});
});
