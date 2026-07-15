import {fireEvent, renderHook} from '@testing-library/react';
import {useWebOSKeys} from './useWebOSKeys';

// Fire a keydown while a single onBack is mounted, and report whether it was treated as Back.
function firesBack(init: KeyboardEventInit & {keyCode?: number}): boolean {
	const onBack = jest.fn();
	const {unmount} = renderHook(() => useWebOSKeys({onBack}));
	fireEvent.keyDown(window, init);
	unmount();
	return onBack.mock.calls.length > 0;
}

describe('useWebOSKeys Back detection', () => {
	test('real Back button (key "GoBack") triggers back on any paired keyCode', () => {
		expect(firesBack({key: 'GoBack', keyCode: 461})).toBe(true);
		expect(firesBack({key: 'GoBack', keyCode: 1536})).toBe(true);
	});

	test('legacy/cross-platform numeric Back codes still trigger back', () => {
		expect(firesBack({keyCode: 461})).toBe(true);
		expect(firesBack({keyCode: 1536})).toBe(true); // webOS 10.x Back, no key set
		expect(firesBack({keyCode: 10009})).toBe(true);
		expect(firesBack({keyCode: 27})).toBe(true);
	});

	// Regression: the LG magic-remote scroll wheel emits keyCode 1536 with key 'Unidentified'
	// while scrolling in 5-way mode. That must not be read as Back, or a scroll pops the view
	// (album/viewer exited mid-scroll on device).
	test('magic-remote wheel scroll (keyCode 1536 + key "Unidentified") does NOT trigger back', () => {
		expect(firesBack({keyCode: 1536, key: 'Unidentified'})).toBe(false);
	});

	test('the wheel filter is scoped to 1536 only — other Back codes still fire even if key is "Unidentified"', () => {
		expect(firesBack({keyCode: 461, key: 'Unidentified'})).toBe(true);
	});
});
