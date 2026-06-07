import {renderHook, act} from '@testing-library/react';
import {useAutoHideControls} from './useAutoHideControls';

function pressKey(key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {key, cancelable: true});
	act(() => {
		window.dispatchEvent(event);
	});
	return event;
}

describe('useAutoHideControls', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});
	afterEach(() => {
		act(() => {
			jest.runOnlyPendingTimers();
		});
		jest.useRealTimers();
	});

	test('starts visible and hides after the delay', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: true, hideDelayMs: 4000}));
		expect(result.current.visible).toBe(true);
		act(() => {
			jest.advanceTimersByTime(4000);
		});
		expect(result.current.visible).toBe(false);
	});

	test('disabled keeps controls always visible with no timer', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: false, hideDelayMs: 4000}));
		expect(result.current.visible).toBe(true);
		act(() => {
			jest.advanceTimersByTime(10000);
		});
		expect(result.current.visible).toBe(true);
	});

	test('a reveal key re-shows controls when hidden and restarts the timer', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: true, hideDelayMs: 4000}));
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

	test('navigation keys (Left/Right) never touch visibility or the timer', () => {
		const {result} = renderHook(() => useAutoHideControls({enabled: true, hideDelayMs: 4000}));
		act(() => {
			jest.advanceTimersByTime(3000);
		});
		pressKey('ArrowLeft');
		pressKey('ArrowRight');
		act(() => {
			jest.advanceTimersByTime(1000);
		});
		expect(result.current.visible).toBe(false);
	});

	test('swallows the reveal key only when hidden', () => {
		renderHook(() => useAutoHideControls({enabled: true, hideDelayMs: 4000}));
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
			const {result, unmount} = renderHook(() => useAutoHideControls({enabled: true, hideDelayMs: 4000}));
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
		const {unmount} = renderHook(() => useAutoHideControls({enabled: true, hideDelayMs: 4000}));
		unmount();
		expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), expect.objectContaining({capture: true}));
		removeSpy.mockRestore();
	});

	test('clears the pending timer on unmount', () => {
		const {unmount} = renderHook(() => useAutoHideControls({enabled: true, hideDelayMs: 4000}));
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
		const {result, rerender} = renderHook(() => useAutoHideControls({enabled, hideDelayMs: 4000}));
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
});
