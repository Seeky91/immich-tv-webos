import React, {useCallback, useMemo, useRef, useState} from 'react';
import {SpottableDiv} from '../../utils/spotlight';
import {DATE_SCRUBBER_SPOTLIGHT_ID} from '../../utils/constants';
import type {TimelineBucket} from '../../domain/types';
import css from './DateScrubber.module.less';

interface DateScrubberProps {
	buckets: TimelineBucket[];
	bucketHeights: number[];
	activeIndex: number;
	// Status of the month at the viewport top: still fetching / failed to fetch.
	isLoading: boolean;
	hasError: boolean;
	onJump: (timeBucket: string) => void;
	onExit: () => void;
}

interface ScrubberMarker {
	index: number;
	topPercent: number;
	year: string;
	showYear: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_YEAR_LABELS = 14;
const RAIL_PADDING_PERCENT = 3;
const RAIL_CONTENT_PERCENT = 100 - RAIL_PADDING_PERCENT * 2;

function clampIndex(index: number, length: number): number {
	return Math.max(0, Math.min(length - 1, index));
}

export function bucketIndexAtPercent(bucketHeights: number[], percent: number): number {
	if (!bucketHeights.length) return 0;
	const totalHeight = bucketHeights.reduce((sum, height) => sum + height, 0);
	if (totalHeight <= 0) return clampIndex(Math.round(percent * (bucketHeights.length - 1)), bucketHeights.length);
	const target = Math.max(0, Math.min(1, percent)) * totalHeight;
	let offset = 0;
	for (let index = 0; index < bucketHeights.length; index++) {
		offset += bucketHeights[index] ?? 0;
		if (target <= offset) return index;
	}
	return bucketHeights.length - 1;
}

export function buildScrubberMarkers(buckets: TimelineBucket[], bucketHeights: number[]): ScrubberMarker[] {
	const totalHeight = bucketHeights.reduce((sum, height) => sum + height, 0);
	const years = Array.from(new Set(buckets.map((bucket) => bucket.timeBucket.slice(0, 4))));
	const labelStride = Math.max(1, Math.ceil(years.length / MAX_YEAR_LABELS));
	let offset = 0;
	let previousYear = '';
	return buckets.map((bucket, index) => {
		const height = bucketHeights[index] ?? 0;
		const year = bucket.timeBucket.slice(0, 4);
		const yearIndex = years.indexOf(year);
		const showYear = year !== previousYear && (yearIndex % labelStride === 0 || yearIndex === years.length - 1);
		previousYear = year;
		const timelinePercent = totalHeight > 0 ? ((offset + height / 2) / totalHeight) * 100 : (index / Math.max(1, buckets.length - 1)) * 100;
		const topPercent = RAIL_PADDING_PERCENT + (timelinePercent / 100) * RAIL_CONTENT_PERCENT;
		offset += height;
		return {index, topPercent, year, showYear};
	});
}

function formatBucketMonth(timeBucket: string): string {
	const [year, month] = timeBucket.split('-').map(Number);
	const monthName = month ? MONTH_NAMES[month - 1] : undefined;
	return monthName && year ? `${monthName} ${year}` : timeBucket;
}

export const DateScrubber: React.FC<DateScrubberProps> = React.memo(
	({buckets, bucketHeights, activeIndex, isLoading, hasError, onJump, onExit}) => {
		const railRef = useRef<HTMLDivElement>(null);
		const [selectedIndex, setSelectedIndex] = useState(activeIndex);
		const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
		const [isFocused, setIsFocused] = useState(false);
		const [isDragging, setIsDragging] = useState(false);
		const markers = useMemo(() => buildScrubberMarkers(buckets, bucketHeights), [buckets, bucketHeights]);

		const indexFromClientY = useCallback(
			(clientY: number) => {
				const rect = railRef.current?.getBoundingClientRect();
				if (!rect || rect.height <= 0) return activeIndex;
				const railPercent = ((clientY - rect.top) / rect.height) * 100;
				const timelinePercent = (railPercent - RAIL_PADDING_PERCENT) / RAIL_CONTENT_PERCENT;
				return bucketIndexAtPercent(bucketHeights, timelinePercent);
			},
			[activeIndex, bucketHeights]
		);

		const commitIndex = useCallback(
			(index: number) => {
				const bucket = buckets[clampIndex(index, buckets.length)];
				if (bucket) onJump(bucket.timeBucket);
			},
			[buckets, onJump]
		);

		const handleFocus = useCallback(() => {
			setIsFocused(true);
			setSelectedIndex(activeIndex);
		}, [activeIndex]);

		const handleBlur = useCallback(() => setIsFocused(false), []);

		const handleKeyDown = useCallback(
			(event: React.KeyboardEvent<HTMLDivElement>) => {
				const key = event.key;
				if (key === 'ArrowUp' || key === 'ArrowDown') {
					setSelectedIndex((current) => clampIndex(current + (key === 'ArrowUp' ? -1 : 1), buckets.length));
				} else if (key === 'Enter') {
					commitIndex(selectedIndex);
				} else if (key === 'ArrowLeft') {
					onExit();
				} else if (key !== 'ArrowRight') {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
			},
			[buckets.length, commitIndex, onExit, selectedIndex]
		);

		const handleMouseDown = useCallback(
			(event: React.MouseEvent<HTMLDivElement>) => {
				if (!Number.isFinite(event.clientY)) return;
				const index = indexFromClientY(event.clientY);
				setSelectedIndex(index);
				setHoveredIndex(index);
				setIsDragging(true);
				event.preventDefault();
			},
			[indexFromClientY]
		);

		const handleMouseMove = useCallback(
			(event: React.MouseEvent<HTMLDivElement>) => {
				if (!isDragging) setHoveredIndex(indexFromClientY(event.clientY));
			},
			[indexFromClientY, isDragging]
		);

		const handleMouseLeave = useCallback(() => {
			if (!isDragging) setHoveredIndex(null);
		}, [isDragging]);

		React.useEffect(() => {
			if (!isDragging) return undefined;
			const handleWindowMouseMove = (event: MouseEvent) => {
				const index = indexFromClientY(event.clientY);
				setSelectedIndex(index);
				setHoveredIndex(index);
			};
			const handleWindowMouseUp = (event: MouseEvent) => {
				const index = indexFromClientY(event.clientY);
				setSelectedIndex(index);
				setHoveredIndex(null);
				setIsDragging(false);
				commitIndex(index);
			};
			window.addEventListener('mousemove', handleWindowMouseMove);
			window.addEventListener('mouseup', handleWindowMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleWindowMouseMove);
				window.removeEventListener('mouseup', handleWindowMouseUp);
			};
		}, [commitIndex, indexFromClientY, isDragging]);

		const displayIndex = hoveredIndex ?? (isFocused || isDragging ? selectedIndex : activeIndex);
		const displayMarker = markers[clampIndex(displayIndex, markers.length)];
		const displayBucket = buckets[clampIndex(displayIndex, buckets.length)];
		const indicatorTop = displayMarker?.topPercent ?? 0;
		const bubbleTop = Math.max(4, Math.min(96, indicatorTop));

		return (
			<div ref={railRef} className={css.scrubberHost}>
				<SpottableDiv
					className={css.scrubber}
					spotlightId={DATE_SCRUBBER_SPOTLIGHT_ID}
					role="scrollbar"
					aria-orientation="vertical"
					aria-valuemin={1}
					aria-valuemax={buckets.length}
					aria-valuenow={displayIndex + 1}
					aria-valuetext={displayBucket ? formatBucketMonth(displayBucket.timeBucket) : undefined}
					aria-busy={isLoading}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
				>
					<div className={css.track} aria-hidden="true" />
					{markers.map((marker) => (
						<div
							key={buckets[marker.index]?.timeBucket}
							className={[css.marker, marker.index === displayIndex ? css.markerSelected : ''].filter(Boolean).join(' ')}
							style={{top: `${marker.topPercent}%`}}
							aria-hidden="true"
						>
							{marker.showYear && <span className={css.year}>{marker.year}</span>}
							<span className={css.dot} />
						</div>
					))}
					<div className={css.positionLine} style={{top: `${indicatorTop}%`}} aria-hidden="true" />
					<div className={css.dateBubble} style={{top: `${bubbleTop}%`}}>
						{displayBucket ? formatBucketMonth(displayBucket.timeBucket) : ''}
						{isLoading && <span className={css.status}>Loading…</span>}
						{hasError && !isLoading && <span className={css.error}>Couldn’t load</span>}
					</div>
				</SpottableDiv>
			</div>
		);
	}
);

DateScrubber.displayName = 'DateScrubber';
