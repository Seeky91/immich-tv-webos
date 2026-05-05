import {useMemo} from 'react';
import ri from '@enact/ui/resolution';
import {calculateJustifiedLayout} from '../utils/justifiedLayout';
import type {JustifiedLayoutResult} from '../utils/justifiedLayout';
import {TARGET_ROW_HEIGHT_PX, GRID_GAP_PX, GRID_HORIZONTAL_PADDING_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX} from '../utils/constants';
import type {TimelineBucket, DayGroup} from '../domain/types';

interface UseTimelineLayoutOptions {
	allBuckets: TimelineBucket[];
	loadedGroups: DayGroup[];
	viewportWidth: number;
}

export const useTimelineLayout = ({allBuckets, loadedGroups, viewportWidth}: UseTimelineLayoutOptions) => {
	const headerBlock = ri.scale(BUCKET_HEADER_HEIGHT_PX) + ri.scale(BUCKET_HEADER_MARGIN_PX);

	const layoutMap = useMemo(() => {
		const map = new Map<string, JustifiedLayoutResult>();
		for (const group of loadedGroups) {
			const ratios = group.assets.map((a) => a.ratio);
			map.set(group.timeBucket, calculateJustifiedLayout(ratios, viewportWidth));
		}
		return map;
	}, [loadedGroups, viewportWidth]);

	const heightMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const [timeBucket, layout] of layoutMap) {
			map.set(timeBucket, headerBlock + layout.totalHeight);
		}
		return map;
	}, [layoutMap, headerBlock]);

	const placeholderHeight = useMemo(() => {
		const rowHeight = ri.scale(TARGET_ROW_HEIGHT_PX);
		const gap = ri.scale(GRID_GAP_PX);
		const rowCapacity = Math.max(1, Math.floor((viewportWidth - ri.scale(GRID_HORIZONTAL_PADDING_PX)) / rowHeight));
		const loadedAssetCount = loadedGroups.reduce((sum, g) => sum + g.count, 0);
		const totalAssets = allBuckets.reduce((sum, b) => sum + b.count, 0);
		const unloadedAssets = Math.max(0, totalAssets - loadedAssetCount);
		const unloadedBuckets = Math.max(0, allBuckets.length - heightMap.size);
		const estimatedRows = Math.ceil(unloadedAssets / rowCapacity);
		return Math.max(0, estimatedRows * (rowHeight + gap) + unloadedBuckets * headerBlock);
	}, [heightMap, headerBlock, allBuckets, loadedGroups, viewportWidth]);

	return {layoutMap, heightMap, placeholderHeight};
};
