import {act, renderHook} from '@testing-library/react';
import {usePhonePairing} from './usePhonePairing';
import type {PairingDriver, PairingPollResult} from '../pairing/types';

const INFO = {url: 'http://192.168.1.42:8788/?c=ABCD2345', code: 'ABCD2345'};

class FakeDriver implements PairingDriver {
	public startCalls = 0;
	public cancelCalls = 0;
	public startError: Error | null = null;
	public pollQueue: PairingPollResult[] = [];

	async start(): Promise<typeof INFO> {
		this.startCalls += 1;
		if (this.startError) throw this.startError;
		return INFO;
	}

	async status(): Promise<PairingPollResult> {
		return this.pollQueue.shift() ?? {state: 'pending'};
	}

	async cancel(): Promise<void> {
		this.cancelCalls += 1;
	}
}

// Non-empty body keeps testing-library/no-unnecessary-act happy (empty act is flagged).
const flush = () =>
	act(async () => {
		await Promise.resolve();
	});
const tick = (ms: number) =>
	act(async () => {
		jest.advanceTimersByTime(ms);
	});

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test('start → waiting with url and code', async () => {
	const driver = new FakeDriver();
	const onPaired = jest.fn();
	const {result} = renderHook(() => usePhonePairing(driver, '', onPaired));
	expect(result.current.state.phase).toBe('starting');
	await flush();
	expect(result.current.state).toEqual({phase: 'waiting', ...INFO});
});

test('approved poll hands the result to onPaired', async () => {
	const driver = new FakeDriver();
	driver.pollQueue = [
		{state: 'pending'},
		{state: 'approved', result: {baseUrl: 'http://x', email: 'q@e.fr', accessToken: 't'}},
	];
	const onPaired = jest.fn(async () => ({success: true as const}));
	const {result} = renderHook(() => usePhonePairing(driver, '', onPaired));
	await flush();
	await tick(2000);
	expect(onPaired).not.toHaveBeenCalled();
	expect(result.current.state.phase).toBe('waiting');
	await tick(2000);
	expect(onPaired).toHaveBeenCalledWith({baseUrl: 'http://x', email: 'q@e.fr', accessToken: 't'});
	expect(result.current.state.phase).toBe('finalizing');
});

test('failed paired login surfaces the error', async () => {
	const driver = new FakeDriver();
	driver.pollQueue = [{state: 'approved', result: {baseUrl: 'http://x', email: 'q@e.fr', accessToken: 't'}}];
	const onPaired = jest.fn(async () => ({success: false as const, errorMessage: 'Server said no'}));
	const {result} = renderHook(() => usePhonePairing(driver, '', onPaired));
	await flush();
	await tick(2000);
	expect(result.current.state).toEqual({phase: 'error', message: 'Server said no', atStart: false});
});

test('start failure reports an atStart error; restart tries again', async () => {
	const driver = new FakeDriver();
	driver.startError = new Error('no service');
	const onPaired = jest.fn();
	const {result} = renderHook(() => usePhonePairing(driver, '', onPaired));
	await flush();
	expect(result.current.state).toEqual({phase: 'error', message: 'no service', atStart: true});

	driver.startError = null;
	act(() => result.current.restart());
	expect(result.current.state.phase).toBe('starting');
	await flush();
	expect(result.current.state).toEqual({phase: 'waiting', ...INFO});
	expect(driver.startCalls).toBe(2);
});

test('expired session becomes a retryable error', async () => {
	const driver = new FakeDriver();
	driver.pollQueue = [{state: 'expired'}];
	const onPaired = jest.fn();
	const {result} = renderHook(() => usePhonePairing(driver, '', onPaired));
	await flush();
	await tick(2000);
	expect(result.current.state).toMatchObject({phase: 'error', atStart: false});
});

test('unmount cancels the session', async () => {
	const driver = new FakeDriver();
	const onPaired = jest.fn();
	const {unmount} = renderHook(() => usePhonePairing(driver, '', onPaired));
	await flush();
	unmount();
	expect(driver.cancelCalls).toBe(1);
});
