import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import ri from '@enact/ui/resolution';
import {TimelineGrid} from './TimelineGrid';
import type {DayGroup, TimelineAsset, TimelineBucket} from '../../domain/types';

let scrubberProps: {activeIndex: number; onJump: (timeBucket: string) => void} | undefined;
let mockLayout: {
	layoutMap: Map<string, unknown>;
	heightMap: Map<string, number>;
	bucketHeights: number[];
	bucketOffsets: number[];
};

jest.mock('../DateScrubber/DateScrubber', () => ({
	DateScrubber: (props: {activeIndex: number; onJump: (timeBucket: string) => void}) => {
		scrubberProps = props;
		return <output data-testid="active-bucket">{props.activeIndex}</output>;
	},
}));

const mockCardStyles = new Map<string, unknown>();

jest.mock('../AssetCard', () => ({
	AssetCard: ({asset, style}: {asset: TimelineAsset; style?: unknown}) => {
		mockCardStyles.set(asset.id, style);
		return <button data-testid="asset">{asset.id}</button>;
	},
}));

jest.mock('../DateHeader', () => ({
	DateHeader: ({timeBucket}: {timeBucket: string}) => <h2>{timeBucket}</h2>,
}));

jest.mock('../../hooks/useTimelineLayout', () => ({
	useTimelineLayout: () => mockLayout,
}));

jest.mock('../../hooks/useTimelineViewportFocus', () => ({
	useTimelineViewportFocus: jest.fn(),
	focusTimelineViewport: jest.fn(),
}));

const VIEWPORT_HEIGHT = 1000;

const asset = (id: string, localDateTime: string): TimelineAsset => ({id, type: 'IMAGE', ratio: 1.5, localDateTime, durationSeconds: null});

const dayGroup = (timeBucket: string, ids: string[]): DayGroup => ({
	timeBucket,
	assets: ids.map((id) => asset(id, `${timeBucket}T12:00:00.000Z`)),
	count: ids.length,
});

const buckets: TimelineBucket[] = [
	{timeBucket: '2026-07-01', count: 5},
	{timeBucket: '2026-06-01', count: 5},
	{timeBucket: '2026-05-01', count: 5},
	{timeBucket: '2026-04-01', count: 5},
];

function makeTimeline(loadedMonths = new Map<string, DayGroup[]>()) {
	return {
		scope: {},
		allBuckets: buckets,
		loadedMonths,
		failedMonths: new Set<string>(),
		requestMonths: jest.fn(),
		fetchMonth: jest.fn(),
	};
}

// Unloaded months are 10000 px estimates; loaded ones are the sum of their day heights.
function layoutFor(loaded: Map<string, DayGroup[]>, dayHeight: number) {
	const heightMap = new Map<string, number>();
	const bucketHeights = buckets.map((bucket) => {
		const groups = loaded.get(bucket.timeBucket);
		if (!groups) return 10000;
		groups.forEach((group) => heightMap.set(group.timeBucket, dayHeight));
		return groups.length * dayHeight;
	});
	const bucketOffsets = bucketHeights.map((_, index) => bucketHeights.slice(0, index).reduce((sum, height) => sum + height, 0));
	return {layoutMap: new Map(), heightMap, bucketHeights, bucketOffsets};
}

function scroller(container: HTMLElement): HTMLElement {
	const node = container.querySelector<HTMLElement>('.scroller')!;
	Object.defineProperty(node, 'clientHeight', {value: VIEWPORT_HEIGHT, configurable: true});
	return node;
}

function scrollTo(node: HTMLElement, top: number) {
	node.scrollTop = top;
	fireEvent.scroll(node);
}

const renderedIds = () => screen.queryAllByTestId('asset').map((card) => card.textContent);

beforeEach(() => {
	scrubberProps = undefined;
	mockCardStyles.clear();
	window.innerHeight = VIEWPORT_HEIGHT;
	mockLayout = layoutFor(new Map(), 0);
});

describe('TimelineGrid month skeleton', () => {
	test('mounts only the days around the viewport', () => {
		const june = [dayGroup('2026-06-20', ['a']), dayGroup('2026-06-10', ['b'])];
		const loaded = new Map([['2026-06-01', june]]);
		mockLayout = layoutFor(loaded, 3000);
		const {container} = render(<TimelineGrid contentWidth={1920} timeline={makeTimeline(loaded)} />);

		// June starts at 10000, under a 10000 px July estimate: one viewport of overscan doesn't reach it.
		expect(renderedIds()).toEqual([]);
		scrollTo(scroller(container), 12000);
		expect(renderedIds()).toEqual(['a', 'b']);
		expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['2026-06-20', '2026-06-10']);
	});

	test('requests the months around the viewport, plus one each way', () => {
		const timeline = makeTimeline();
		const {container} = render(<TimelineGrid contentWidth={1920} timeline={timeline} />);
		expect(timeline.requestMonths).toHaveBeenLastCalledWith(['2026-07-01', '2026-06-01'], undefined);

		scrollTo(scroller(container), 25000);
		expect(timeline.requestMonths).toHaveBeenLastCalledWith(['2026-06-01', '2026-05-01', '2026-04-01'], undefined);
		expect(screen.getByTestId('active-bucket').textContent).toBe('2');
	});

	test('scrubber jump scrolls to the month offset immediately and retries failed months', () => {
		const timeline = makeTimeline();
		const {container} = render(<TimelineGrid contentWidth={1920} timeline={timeline} />);
		const node = scroller(container);

		act(() => scrubberProps?.onJump('2026-05-01'));

		expect(node.scrollTop).toBe(20000);
		expect(timeline.requestMonths).toHaveBeenCalledWith(['2026-07-01', '2026-06-01', '2026-05-01', '2026-04-01'], {retryFailed: true});
		expect(screen.getByTestId('active-bucket').textContent).toBe('2');
	});

	test('a jump the DOM rounds a pixel short of the month still reports that month', () => {
		mockLayout = {layoutMap: new Map(), heightMap: new Map(), bucketHeights: [10000.5, 10000.5, 10000.5, 10000.5], bucketOffsets: [0, 10000.5, 20001, 30001.5]};
		const {container} = render(<TimelineGrid contentWidth={1920} timeline={makeTimeline()} />);
		const node = scroller(container);

		act(() => scrubberProps?.onJump('2026-06-01'));
		scrollTo(node, 10000);

		expect(screen.getByTestId('active-bucket').textContent).toBe('1');
	});

	test('a month loading above keeps the on-screen content in place', () => {
		const may = [dayGroup('2026-05-20', ['m1']), dayGroup('2026-05-10', ['m2'])];
		let loaded = new Map([['2026-05-01', may]]);
		mockLayout = layoutFor(loaded, 5000);
		const timeline = makeTimeline(loaded);
		const {container, rerender} = render(<TimelineGrid contentWidth={1920} timeline={timeline} />);
		const node = scroller(container);
		scrollTo(node, 21000); // 1000 px into May's first day

		// July loads and is much shorter than its 10000 px estimate.
		loaded = new Map([...loaded, ['2026-07-01', [dayGroup('2026-07-04', ['j1'])]]]);
		mockLayout = layoutFor(loaded, 5000);
		rerender(<TimelineGrid contentWidth={1920} timeline={makeTimeline(loaded)} />);

		expect(node.scrollTop).toBe(16000); // still 1000 px into May's first day
	});

	test('keeps the focused card mounted while a month loads above it', () => {
		const may = [dayGroup('2026-05-20', ['m1'])];
		let loaded = new Map([['2026-05-01', may]]);
		mockLayout = layoutFor(loaded, 3000);
		const {container, rerender} = render(<TimelineGrid contentWidth={1920} timeline={makeTimeline(loaded)} />);
		scrollTo(scroller(container), 20500);
		const card = screen.getByText('m1');
		card.focus();

		loaded = new Map([...loaded, ['2026-07-01', [dayGroup('2026-07-04', ['j1'])]]]);
		mockLayout = layoutFor(loaded, 3000);
		rerender(<TimelineGrid contentWidth={1920} timeline={makeTimeline(loaded)} />);

		expect(screen.getByText('m1')).toBe(card);
		expect(document.activeElement).toBe(card);
	});

	test('mounts only the rows of a long day that are around the viewport, with stable card styles', () => {
		const ids = Array.from({length: 20}, (_, i) => `r${i}`);
		const day = dayGroup('2026-06-20', ids);
		const assetLayouts = ids.map((_, i) => ({top: i * 500, left: 0, width: 300, height: 400}));
		mockLayout = {
			layoutMap: new Map([['2026-06-20', {totalHeight: 10000, assetLayouts}]]),
			heightMap: new Map([['2026-06-20', ri.scale(128) + 10000]]),
			bucketHeights: [],
			bucketOffsets: [],
		};
		const {container} = render(<TimelineGrid contentWidth={1920} groups={[day]} />);
		expect(renderedIds()).toEqual(['r0', 'r1', 'r2', 'r3']);

		const node = scroller(container);
		scrollTo(node, 3000);
		expect(renderedIds()).toContain('r9');
		expect(renderedIds()).not.toContain('r1');
		const style = mockCardStyles.get('r6');

		scrollTo(node, 3200);
		expect(renderedIds()).toContain('r10');
		expect(mockCardStyles.get('r6')).toBe(style);
	});
});
