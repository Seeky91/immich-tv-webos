import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {TimelineGrid} from './TimelineGrid';
import type {DayGroup, TimelineAsset, TimelineBucket} from '../../domain/types';

interface MockVirtualListProps {
	className?: string;
	dataSize: number;
	itemRenderer: (props: {index: number}) => React.ReactNode;
	onScroll?: () => void;
}

let virtualListProps: MockVirtualListProps | undefined;
let scrubberProps: {activeIndex: number; onJump: (timeBucket: string) => void} | undefined;
let mockLayout: {
	layoutMap: Map<string, unknown>;
	heightMap: Map<string, number>;
	bucketHeights: number[];
	bucketOffsets: number[];
};

jest.mock('@enact/sandstone/VirtualList', () => ({
	VirtualList: (props: MockVirtualListProps) => {
		virtualListProps = props;
		return <div className={props.className} style={{overflowY: 'auto'}} data-testid="scroll-node" />;
	},
}));

jest.mock('../DateScrubber/DateScrubber', () => ({
	DateScrubber: (props: {activeIndex: number; onJump: (timeBucket: string) => void}) => {
		scrubberProps = props;
		return <output data-testid="active-bucket">{props.activeIndex}</output>;
	},
}));

jest.mock('../AssetCard', () => ({
	AssetCard: ({asset}: {asset: TimelineAsset}) => <div data-testid="asset">{asset.id}</div>,
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
];

function makeTimeline(loadedMonths = new Map<string, DayGroup[]>()) {
	return {
		allBuckets: buckets,
		loadedMonths,
		failedMonths: new Set<string>(),
		requestMonths: jest.fn(),
	};
}

function enableScrolling() {
	const scrollNode = screen.getByTestId('scroll-node');
	Object.defineProperty(scrollNode, 'scrollHeight', {value: 30000, configurable: true});
	Object.defineProperty(scrollNode, 'clientHeight', {value: 1000, configurable: true});
	return scrollNode;
}

beforeEach(() => {
	virtualListProps = undefined;
	scrubberProps = undefined;
	mockLayout = {
		layoutMap: new Map(),
		heightMap: new Map(),
		bucketHeights: [10000, 10000, 10000],
		bucketOffsets: [0, 10000, 20000],
	};
});

describe('TimelineGrid month skeleton', () => {
	test('renders loaded day groups and one placeholder per unloaded month', () => {
		const loaded = new Map([['2026-07-01', [dayGroup('2026-07-14', ['a', 'b']), dayGroup('2026-07-13', ['c'])]]]);
		render(<TimelineGrid contentWidth={1920} timeline={makeTimeline(loaded)} />);

		expect(virtualListProps?.dataSize).toBe(4);
		render(<>{virtualListProps?.itemRenderer({index: 0})}</>);
		expect(screen.getByRole('heading').textContent).toBe('2026-07-14');
		const placeholder = virtualListProps?.itemRenderer({index: 2}) as React.ReactElement<{'aria-hidden': string}>;
		expect(placeholder.props['aria-hidden']).toBe('true');
	});

	test('requests the months intersecting the viewport on mount and on scroll', () => {
		const timeline = makeTimeline();
		render(<TimelineGrid contentWidth={1920} timeline={timeline} />);
		expect(timeline.requestMonths).toHaveBeenCalledWith(['2026-07-01'], undefined);

		const scrollNode = enableScrolling();
		scrollNode.scrollTop = 25000;
		act(() => virtualListProps?.onScroll?.());
		expect(timeline.requestMonths).toHaveBeenCalledWith(['2026-05-01'], undefined);
		expect(screen.getByTestId('active-bucket').textContent).toBe('2');
	});

	test('scrubber jump scrolls to the month offset immediately and retries failed months', () => {
		const timeline = makeTimeline();
		render(<TimelineGrid contentWidth={1920} timeline={timeline} />);
		const scrollNode = enableScrolling();

		act(() => scrubberProps?.onJump('2026-05-01'));

		expect(scrollNode.scrollTop).toBe(20000);
		expect(timeline.requestMonths).toHaveBeenCalledWith(['2026-06-01', '2026-05-01'], {retryFailed: true});
		expect(screen.getByTestId('active-bucket').textContent).toBe('2');
	});

	test('compensates scroll position when months above the viewport change height', () => {
		const timeline = makeTimeline();
		const {rerender} = render(<TimelineGrid contentWidth={1920} timeline={timeline} />);
		const scrollNode = enableScrolling();
		scrollNode.scrollTop = 21000; // 10% into the third month

		// First month loads and turns out much smaller than its estimate (10000 → 4000).
		mockLayout = {...mockLayout, bucketHeights: [4000, 10000, 10000], bucketOffsets: [0, 4000, 14000]};
		rerender(<TimelineGrid contentWidth={1920} timeline={makeTimeline()} />);

		expect(scrollNode.scrollTop).toBe(15000); // still 10% into the third month
	});
});
