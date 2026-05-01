import {useMemo} from 'react';
import {calculateBucketHeight} from '../utils/justifiedLayout';
import {TARGET_ROW_HEIGHT_PX, GRID_GAP_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX} from '../utils/constants';
import type {TimelineBucket, DayGroup} from '../domain/types';

interface UseHeightMapOptions {
	allBuckets: TimelineBucket[];
	loadedGroups: DayGroup[];
	viewportWidth: number;
}

export const useHeightMap = ({allBuckets, loadedGroups, viewportWidth}: UseHeightMapOptions) => {
	const heightMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const group of loadedGroups) {
			const ratios = group.assets.map((a) => a.ratio);
			map.set(group.timeBucket, calculateBucketHeight(ratios, viewportWidth));
		}
		return map;
	}, [loadedGroups, viewportWidth]);

	const exactLoadedHeight = useMemo(
		() => loadedGroups.reduce((sum, g) => sum + (heightMap.get(g.timeBucket) ?? 0), 0),
		[loadedGroups, heightMap]
	);

	const estimatedTotalHeight = useMemo(() => {
		const loadedSum = Array.from(heightMap.values()).reduce((sum, h) => sum + h, 0);
		const rowCapacity = Math.max(1, Math.floor((viewportWidth - 80) / TARGET_ROW_HEIGHT_PX));
		const loadedAssetCount = loadedGroups.reduce((sum, g) => sum + g.count, 0);
		const totalAssets = allBuckets.reduce((sum, b) => sum + b.count, 0);
		const unloadedAssets = Math.max(0, totalAssets - loadedAssetCount);
		const unloadedBuckets = Math.max(0, allBuckets.length - heightMap.size);
		const estimatedRows = Math.ceil(unloadedAssets / rowCapacity);
		const estimatedUnloaded =
			estimatedRows * (TARGET_ROW_HEIGHT_PX + GRID_GAP_PX) +
			unloadedBuckets * (BUCKET_HEADER_HEIGHT_PX + BUCKET_HEADER_MARGIN_PX);
		return loadedSum + estimatedUnloaded;
	}, [heightMap, allBuckets, loadedGroups, viewportWidth]);

	const placeholderHeight = Math.max(0, estimatedTotalHeight - exactLoadedHeight);

	return {heightMap, exactLoadedHeight, estimatedTotalHeight, placeholderHeight};
};
