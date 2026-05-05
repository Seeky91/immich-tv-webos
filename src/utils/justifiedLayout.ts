import ri from '@enact/ui/resolution';
import {TARGET_ROW_HEIGHT_PX, GRID_GAP_PX, GRID_HORIZONTAL_PADDING_PX} from './constants';

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

export function calculateJustifiedLayout(ratios: number[], viewportWidth: number): JustifiedLayoutResult {
	const rowHeight = ri.scale(TARGET_ROW_HEIGHT_PX);
	const gap = ri.scale(GRID_GAP_PX);
	const containerWidth = viewportWidth - ri.scale(GRID_HORIZONTAL_PADDING_PX);
	const rows: LayoutRow[] = [];
	let currentRow: number[] = [];
	let currentRowWidth = 0;

	for (let i = 0; i < ratios.length; i++) {
		const ratio = ratios[i]!;
		const assetWidth = rowHeight * ratio;
		const gapWidth = currentRow.length > 0 ? gap : 0;

		if (currentRowWidth + gapWidth + assetWidth > containerWidth && currentRow.length > 0) {
			const availableWidth = containerWidth - (currentRow.length - 1) * gap;
			const sumOfRatios = currentRow.reduce((sum, idx) => sum + ratios[idx]!, 0);
			rows.push({assets: currentRow, height: availableWidth / sumOfRatios});
			currentRow = [i];
			currentRowWidth = assetWidth;
		} else {
			currentRow.push(i);
			currentRowWidth += gapWidth + assetWidth;
		}
	}

	if (currentRow.length > 0) {
		rows.push({assets: currentRow, height: rowHeight});
	}

	const totalHeight = rows.reduce((sum, row) => sum + row.height, 0) + Math.max(0, rows.length - 1) * gap;

	const assetLayouts: AssetLayout[] = new Array(ratios.length);
	let currentTop = 0;
	for (const row of rows) {
		let currentLeft = 0;
		for (const assetIdx of row.assets) {
			const assetWidth = row.height * ratios[assetIdx]!;
			assetLayouts[assetIdx] = {top: currentTop, left: currentLeft, width: assetWidth, height: row.height};
			currentLeft += assetWidth + gap;
		}
		currentTop += row.height + gap;
	}

	return {rows, totalHeight, assetLayouts};
}
