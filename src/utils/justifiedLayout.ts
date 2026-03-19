import {TARGET_ROW_HEIGHT_PX, GRID_GAP_PX, BUCKET_HEADER_HEIGHT_PX, BUCKET_HEADER_MARGIN_PX} from './constants';

export interface LayoutRow {
	assets: number[];
	height: number;
}

export interface AssetLayout {
	top: number;
	left: number;
	width: number;
	height: number;
}

export interface JustifiedLayoutResult {
	rows: LayoutRow[];
	totalHeight: number;
	assetLayouts: AssetLayout[];
}

export function calculateJustifiedLayout(ratios: number[], viewportWidth: number, padding: number = 80): JustifiedLayoutResult {
	const containerWidth = viewportWidth - padding;
	const rows: LayoutRow[] = [];
	let currentRow: number[] = [];
	let currentRowWidth = 0;

	for (let i = 0; i < ratios.length; i++) {
		const ratio = ratios[i];
		const assetWidth = TARGET_ROW_HEIGHT_PX * ratio;
		const gapWidth = currentRow.length > 0 ? GRID_GAP_PX : 0;

		if (currentRowWidth + gapWidth + assetWidth > containerWidth && currentRow.length > 0) {
			const availableWidth = containerWidth - (currentRow.length - 1) * GRID_GAP_PX;
			const sumOfRatios = currentRow.reduce((sum, idx) => sum + ratios[idx], 0);
			rows.push({assets: [...currentRow], height: availableWidth / sumOfRatios});
			currentRow = [i];
			currentRowWidth = assetWidth;
		} else {
			currentRow.push(i);
			currentRowWidth += gapWidth + assetWidth;
		}
	}

	if (currentRow.length > 0) {
		rows.push({assets: currentRow, height: TARGET_ROW_HEIGHT_PX});
	}

	const totalHeight = rows.reduce((sum, row) => sum + row.height, 0) + Math.max(0, rows.length - 1) * GRID_GAP_PX;

	const assetLayouts: AssetLayout[] = new Array(ratios.length);
	let currentTop = 0;
	for (const row of rows) {
		let currentLeft = 0;
		for (const assetIdx of row.assets) {
			const assetWidth = row.height * ratios[assetIdx];
			assetLayouts[assetIdx] = {top: currentTop, left: currentLeft, width: assetWidth, height: row.height};
			currentLeft += assetWidth + GRID_GAP_PX;
		}
		currentTop += row.height + GRID_GAP_PX;
	}

	return {rows, totalHeight, assetLayouts};
}

export function calculateBucketHeight(ratios: number[], viewportWidth: number): number {
	if (ratios.length === 0) return BUCKET_HEADER_HEIGHT_PX + BUCKET_HEADER_MARGIN_PX;
	const layout = calculateJustifiedLayout(ratios, viewportWidth);
	return BUCKET_HEADER_HEIGHT_PX + BUCKET_HEADER_MARGIN_PX + layout.totalHeight;
}
