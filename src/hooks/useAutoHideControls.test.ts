import {renderHook, act} from '@testing-library/react';
import {useAutoHideControls} from './useAutoHideControls';

// Keys reach window from the focused element: dispatch on `target` so it bubbles there.
function pressKey(key: string, target: EventTarget = window): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {key, cancelable: true, bubbles: true});
	act(() => {
		target.dispatchEvent(event);
	});
	return event;
}

function makeControls() {
	const controls = document.createElement('div');
	const button = document.createElement('button');
	controls.appendChild(button);
	document.body.appendChild(controls);
	return {controlsRef: {current: controls}, button};
}

const controlsRef = {current: null};

describe('useAutoHideControls', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});
	afterEach(() => {
		act(() => {
			jest.runOnlyPendingTimers();
		});
		jest.useRealTimers();
		document.body.replaceChildren();
	});

	test('starts visible and hides after the delay', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
		expect(result.current.visible).toBe(true);
		act(() => {
			jest.advanceTimersByTime(4000);
		});
		expect(result.current.visible).toBe(false);
	});

	test('disabled keeps controls always visible with no timer', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: false, controlsRef, hideDelayMs: 4000}));
		expect(result.current.visible).toBe(true);
		act(() => {
			jest.advanceTimersByTime(10000);
		});
		expect(result.current.visible).toBe(true);
	});

	test('a reveal key re-shows controls when hidden and restarts the timer', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
		act(() => {
			jest.advanceTimersByTime(4000);
		});
		expect(result.current.visible).toBe(false);

		pressKey('Enter');
		expect(result.current.visible).toBe(true);

		act(() => {
			jest.advanceTimersByTime(3999);
		});
		expect(result.current.visible).toBe(true);
		act(() => {
			jest.advanceTimersByTime(1);
		});
		expect(result.current.visible).toBe(false);
	});

	test('paging with Left/Right outside the controls neither reveals nor keeps them up', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
		act(() => {
			jest.advanceTimersByTime(3000);
		});
		pressKey('ArrowLeft');
		pressKey('ArrowRight');
		act(() => {
			jest.advanceTimersByTime(1000);
		});
		expect(result.current.visible).toBe(false);
		pressKey('ArrowRight');
		expect(result.current.visible).toBe(false);
	});

	test('moving between the controls keeps them up until the user goes idle', () => {
		const {controlsRef: ref, button} = makeControls();
		const {result} = renderHook(() => useAutoHideControls({enabled: true, controlsRef: ref, hideDelayMs: 4000}));
		for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft']) {
			act(() => {
				jest.advanceTimersByTime(3000);
			});
			const event = pressKey(key, button);
			expect(event.defaultPrevented).toBe(false);
		}
		expect(result.current.visible).toBe(true);
		act(() => {
			jest.advanceTimersByTime(4000);
		});
		expect(result.current.visible).toBe(false);
	});

	test('pointer movement over the controls keeps them up', () => {
		const {controlsRef: ref, button} = makeControls();
		const {result} = renderHook(() => useAutoHideControls({enabled: true, controlsRef: ref, hideDelayMs: 4000}));
		act(() => {
			jest.advanceTimersByTime(3000);
		});
		act(() => {
			button.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
		});
		act(() => {
			jest.advanceTimersByTime(3000);
		});
		expect(result.current.visible).toBe(true);
		act(() => {
			window.dispatchEvent(new MouseEvent('mousemove'));
			jest.advanceTimersByTime(1000);
		});
		expect(result.current.visible).toBe(false);
	});

	test('swallows the reveal key only when hidden', () => {
		renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
		const whileVisible = pressKey('Enter');
		expect(whileVisible.defaultPrevented).toBe(false);
		act(() => {
			jest.advanceTimersByTime(4000);
		});
		const whileHidden = pressKey('Enter');
		expect(whileHidden.defaultPrevented).toBe(true);
	});

	test('ArrowUp and ArrowDown also act as reveal keys', () => {
		['ArrowUp', 'ArrowDown'].forEach((key) => {
			const {result, unmount} = renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
			act(() => {
				jest.advanceTimersByTime(4000);
			});
			expect(result.current.visible).toBe(false);
			pressKey(key);
			expect(result.current.visible).toBe(true);
			unmount();
		});
	});

	test('removes its keydown listener on unmount', () => {
		const removeSpy = jest.spyOn(window, 'removeEventListener');
		const {unmount} = renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
		unmount();
		expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), expect.objectContaining({capture: true}));
		removeSpy.mockRestore();
	});

	test('clears the pending timer on unmount', () => {
		const {unmount} = renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
		unmount();
		// The in-flight timer must be cancelled — elapsing it should not fire a state update.
		expect(() =>
			act(() => {
				jest.advanceTimersByTime(4000);
			})
		).not.toThrow();
	});

	test('disabling mid-lifecycle restores visibility and stops the timer', () => {
		let enabled = true;
		const {result, rerender} = renderHook(() => useAutoHideControls({enabled, controlsRef, hideDelayMs: 4000}));
		act(() => {
			jest.advanceTimersByTime(4000);
		});
		expect(result.current.visible).toBe(false);

		enabled = false;
		rerender();
		expect(result.current.visible).toBe(true);
		// No timer running while disabled — advancing time keeps controls visible.
		act(() => {
			jest.advanceTimersByTime(10000);
		});
		expect(result.current.visible).toBe(true);
	});

	test('hide and show toggle the controls imperatively', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: true, controlsRef, hideDelayMs: 4000}));
		act(() => result.current.hide());
		expect(result.current.visible).toBe(false);
		act(() => result.current.show());
		expect(result.current.visible).toBe(true);
	});
});
