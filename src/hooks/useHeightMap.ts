import {useMemo} from 'react';
import {calculateBucketHeight} from '../utils/justifiedLayout';
import {TARGET_ROW_HEIGHT_PX, GRID_GAP_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX} from '../utils/constants';
import type {BucketMetadata, TimelineBucket, GroupedAsset} from '../api/types';

interface UseHeightMapOptions {
	metadataMap: Map<string, BucketMetadata>;
	allBuckets: TimelineBucket[];
	loadedGroups: GroupedAsset[];
	viewportWidth: number;
}

export const useHeightMap = ({metadataMap, allBuckets, loadedGroups, viewportWidth}: UseHeightMapOptions) => {
	const heightMap = useMemo(() => {
		const map = new Map<string, number>();
		metadataMap.forEach((metadata, date) => {
			map.set(date, calculateBucketHeight(metadata.ratios, viewportWidth));
		});
		return map;
	}, [metadataMap, viewportWidth]);

	const exactLoadedHeight = useMemo(
		() => loadedGroups.reduce((sum, group) => sum + (heightMap.get(group.timeBucket) ?? 0), 0),
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
