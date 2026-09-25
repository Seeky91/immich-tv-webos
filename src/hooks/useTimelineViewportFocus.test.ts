import {act, renderHook} from '@testing-library/react';
import Spotlight from '@enact/spotlight';
import {spottableClass} from '@enact/spotlight/Spottable';
import {DATE_SCRUBBER_SPOTLIGHT_ID, NAVIGATION_RAIL_ID} from '../utils/constants';
import {focusTimelineViewport, useTimelineViewportFocus} from './useTimelineViewportFocus';

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
	return {
		x: left,
		y: top,
		left,
		top,
		right: left + width,
		bottom: top + height,
		width,
		height,
		toJSON: () => ({}),
	};
}

function makeViewport(...cardRects: DOMRect[]) {
	const viewport = document.createElement('div');
	viewport.getBoundingClientRect = () => makeRect(180, 0, 840, 720);
	const cards = cardRects.map(rect => {
		const card = document.createElement('div');
		card.tabIndex = -1;
		card.className = spottableClass;
		card.getBoundingClientRect = () => rect;
		viewport.appendChild(card);
		return card;
	});
	document.body.appendChild(viewport);
	return {viewport, cards};
}

function pressLeft(): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true});
	Object.defineProperty(event, 'keyCode', {value: 37});
	act(() => window.dispatchEvent(event));
	return event;
}

function pressRight(): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true});
	Object.defineProperty(event, 'keyCode', {value: 39});
	act(() => window.dispatchEvent(event));
	return event;
}

describe('useTimelineViewportFocus', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		document.body.replaceChildren();
	});

	test('moves focus to the navigation rail from the leftmost card in a row', () => {
		const {viewport, cards} = makeViewport(makeRect(240, 100, 200, 150), makeRect(448, 100, 200, 150));
		jest.spyOn(Spotlight, 'getCurrent').mockReturnValue(cards[0] as never);
		const setPointerMode = jest.spyOn(Spotlight, 'setPointerMode');
		const focus = jest.spyOn(Spotlight, 'focus').mockReturnValue(true);

		renderHook(() => useTimelineViewportFocus({enabled: true, viewportRef: {current: viewport}}));
		const event = pressLeft();

		expect(setPointerMode).toHaveBeenCalledWith(false);
		expect(focus).toHaveBeenCalledWith(`#${NAVIGATION_RAIL_ID}`);
		expect(event.defaultPrevented).toBe(true);
	});

	test('still moves to the previous photo when one exists in the same row', () => {
		const {viewport, cards} = makeViewport(makeRect(240, 100, 200, 150), makeRect(448, 100, 200, 150));
		jest.spyOn(Spotlight, 'getCurrent').mockReturnValue(cards[1] as never);
		const focus = jest.spyOn(Spotlight, 'focus').mockReturnValue(true);

		renderHook(() => useTimelineViewportFocus({enabled: true, viewportRef: {current: viewport}}));
		pressLeft();

		expect(focus).toHaveBeenCalledWith(cards[0]);
		expect(focus).not.toHaveBeenCalledWith(`#${NAVIGATION_RAIL_ID}`);
	});

	test('establishes native focus after pointer mode without allowing the list to scroll on focus', () => {
		const {viewport, cards} = makeViewport(makeRect(240, 100, 200, 150), makeRect(448, 100, 200, 150));
		let pointerMode = true;
		jest.spyOn(Spotlight, 'getPointerMode').mockImplementation(() => pointerMode);
		jest.spyOn(Spotlight, 'setPointerMode').mockImplementation((value) => { pointerMode = value; });
		jest.spyOn(Spotlight, 'getCurrent').mockImplementation(() => document.activeElement as never);
		jest.spyOn(Spotlight, 'focus').mockImplementation((target) => {
			// Spotlight refuses programmatic focus while a Magic Remote pointer is visible.
			if (pointerMode || !(target instanceof HTMLElement)) return false;
			target.focus();
			return true;
		});
		cards[1]!.focus();
		const listFocus = jest.fn(() => expect(pointerMode).toBe(true));
		viewport.addEventListener('focusin', listFocus);
		renderHook(() => useTimelineViewportFocus({enabled: true, viewportRef: {current: viewport}}));

		pressLeft();

		expect(document.activeElement).toBe(cards[0]);
		expect(listFocus).toHaveBeenCalledTimes(1);
		expect(pointerMode).toBe(false);
	});

	test('restores focus to a visible card after pointer movement blurred the grid', () => {
		const {viewport, cards} = makeViewport(makeRect(240, 100, 200, 150));
		let pointerMode = true;
		jest.spyOn(Spotlight, 'setPointerMode').mockImplementation((value) => { pointerMode = value; });
		jest.spyOn(Spotlight, 'focus').mockImplementation((target) => {
			if (pointerMode || !(target instanceof HTMLElement)) return false;
			target.focus();
			return true;
		});

		act(() => { focusTimelineViewport(viewport); });

		expect(document.activeElement).toBe(cards[0]);
		expect(pointerMode).toBe(false);
	});

	test('moves focus to the date scrubber from the rightmost card in a row', () => {
		const {viewport, cards} = makeViewport(makeRect(240, 100, 200, 150), makeRect(448, 100, 200, 150));
		jest.spyOn(Spotlight, 'getCurrent').mockReturnValue(cards[1] as never);
		const setPointerMode = jest.spyOn(Spotlight, 'setPointerMode');
		const focus = jest.spyOn(Spotlight, 'focus').mockReturnValue(true);

		renderHook(() =>
			useTimelineViewportFocus({
				enabled: true,
				viewportRef: {current: viewport},
				rightEdgeSpotlightId: DATE_SCRUBBER_SPOTLIGHT_ID,
			})
		);
		const event = pressRight();

		expect(setPointerMode).toHaveBeenCalledWith(false);
		expect(focus).toHaveBeenCalledWith(DATE_SCRUBBER_SPOTLIGHT_ID);
		expect(event.defaultPrevented).toBe(true);
	});

	test('suppresses Enact scroll-on-focus when focus enters the grid from outside', async () => {
		const {viewport, cards} = makeViewport(makeRect(240, 100, 200, 150));
		jest.spyOn(Spotlight, 'getPointerMode').mockReturnValue(false);
		const setPointerMode = jest.spyOn(Spotlight, 'setPointerMode');

		renderHook(() => useTimelineViewportFocus({enabled: true, viewportRef: {current: viewport}}));
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		act(() => {
			cards[0]!.dispatchEvent(new FocusEvent('focusin', {bubbles: true, relatedTarget: outside}));
		});

		// Pointer mode is flipped on for the dispatch (Enact skips its scrollTo), restored after.
		expect(setPointerMode).toHaveBeenCalledWith(true);
		await act(async () => Promise.resolve());
		expect(setPointerMode).toHaveBeenLastCalledWith(false);
	});

	test('leaves in-grid focus moves alone (no pointer-mode toggling)', () => {
		const {viewport, cards} = makeViewport(makeRect(240, 100, 200, 150), makeRect(448, 100, 200, 150));
		const setPointerMode = jest.spyOn(Spotlight, 'setPointerMode');

		renderHook(() => useTimelineViewportFocus({enabled: true, viewportRef: {current: viewport}}));
		act(() => {
			cards[1]!.dispatchEvent(new FocusEvent('focusin', {bubbles: true, relatedTarget: cards[0]}));
		});

		expect(setPointerMode).not.toHaveBeenCalled();
	});
});
