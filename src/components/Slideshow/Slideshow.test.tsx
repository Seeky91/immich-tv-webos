import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {RepositoryProvider} from '../../domain/RepositoryContext';
import type {PhotoRepository} from '../../domain/PhotoRepository';
import {createSlideshowPlaylist} from '../../domain/slideshow';
import type {TimelineAsset} from '../../domain/types';
import {Slideshow} from './Slideshow';

jest.mock('../../domain/slideshow', () => ({createSlideshowPlaylist: jest.fn()}));
jest.mock('../../hooks/useAutoHideControls', () => ({useAutoHideControls: () => ({visible: true})}));
jest.mock('../MediaInfo/MediaInfo', () => ({MediaInfo: () => null}));
jest.mock('../RoundButton', () => ({
	RoundButton: ({tooltipText, onClick}: {tooltipText: string; onClick: () => void}) => <button onClick={onClick}>{tooltipText}</button>,
}));

const photo = (id: string): TimelineAsset => ({id, type: 'IMAGE', ratio: 1.5, localDateTime: '2026-09-19', durationSeconds: null});
const repository = {previewUrl: (id: string) => `/preview/${id}`} as PhotoRepository;
const source = {assets: [photo('a'), photo('b')]};
const makePlaylist = () => ({next: jest.fn(), previous: jest.fn(), peek: jest.fn().mockResolvedValue(null)});
let playlist: ReturnType<typeof makePlaylist>;
let preloads: HTMLImageElement[];

const mount = () => render(
	<RepositoryProvider repository={repository}>
		<Slideshow start={source.assets[0]!} source={source} onExit={jest.fn()} />
	</RepositoryProvider>
);
const load = async (image: HTMLImageElement) => { await act(async () => { image.dispatchEvent(new Event('load'));  }); };

beforeEach(() => {
	jest.useFakeTimers();
	localStorage.clear();
	playlist = makePlaylist();
	(createSlideshowPlaylist as jest.Mock).mockReset().mockReturnValue(playlist);
	preloads = [];
	jest.spyOn(window, 'Image').mockImplementation(() => {
		const image = document.createElement('img');
		preloads.push(image);
		return image;
	});
});
afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

test('loads the initial photo and advances after its display interval', async () => {
	playlist.next.mockResolvedValueOnce(photo('a')).mockResolvedValueOnce(photo('b'));
	mount();
	await waitFor(() => expect(preloads).toHaveLength(1));
	expect(screen.queryByAltText('')).toBeNull();
	await load(preloads[0]!);
	const first = screen.getByAltText('');
	expect(first.getAttribute('src')).toBe('/preview/a');
	await load(first as HTMLImageElement);
	await act(async () => { jest.advanceTimersByTime(10000); });
	await load(preloads[1]!);
	expect(screen.getAllByAltText('').map(image => image.getAttribute('src'))).toContain('/preview/b');
});

test('reports an empty playlist after the asynchronous load completes', async () => {
	playlist.next.mockResolvedValue(null);
	mount();
	expect(await screen.findByText('No photos to show.')).toBeTruthy();
});

test('retries an initial load failure, including a synchronous source exception', async () => {
	playlist.next.mockImplementationOnce(() => { throw new Error('Source unavailable'); }).mockResolvedValue(photo('a'));
	mount();
	await waitFor(() => expect(playlist.peek).toHaveBeenCalled());
	await act(async () => { jest.advanceTimersByTime(10000); });
	await load(preloads[0]!);
	expect(screen.getByAltText('').getAttribute('src')).toBe('/preview/a');
});

test('ignores a late preload from the previous playback order', async () => {
	playlist.next.mockResolvedValue(photo('a'));
	mount();
	await waitFor(() => expect(preloads).toHaveLength(1));
	const nextPlaylist = makePlaylist();
	nextPlaylist.next.mockResolvedValue(photo('b'));
	(createSlideshowPlaylist as jest.Mock).mockReturnValue(nextPlaylist);
	fireEvent.click(screen.getByRole('button', {name: 'Shuffle off'}));
	await waitFor(() => expect(preloads).toHaveLength(2));
	await load(preloads[1]!);
	await load(preloads[0]!);
	expect(screen.getAllByAltText('').map(image => image.getAttribute('src'))).toEqual(['/preview/b']);
});
