export interface LayoutRow {
	assets: number[];
	height: number;
}

export interface JustifiedLayoutResult {
	rows: LayoutRow[];
	totalHeight: number;
}

const TARGET_ROW_HEIGHT = 280;
const GAP = 8;

export function calculateJustifiedLayout(ratios: number[], viewportWidth: number, padding: number = 80): JustifiedLayoutResult {
	const containerWidth = viewportWidth - padding;
	const rows: LayoutRow[] = [];
	let currentRow: number[] = [];
	let currentRowWidth = 0;

	for (let i = 0; i < ratios.length; i++) {
		const ratio = ratios[i];
		const assetWidth = TARGET_ROW_HEIGHT * ratio;

		const gapWidth = currentRow.length > 0 ? GAP : 0;

		if (currentRowWidth + gapWidth + assetWidth > containerWidth && currentRow.length > 0) {
			const availableWidth = containerWidth - (currentRow.length - 1) * GAP;
			const sumOfRatios = currentRow.reduce((sum, idx) => sum + ratios[idx], 0);
			const rowHeight = availableWidth / sumOfRatios;

			rows.push({assets: [...currentRow], height: rowHeight});

			currentRow = [i];
			currentRowWidth = assetWidth;
		} else {
			currentRow.push(i);
			currentRowWidth += gapWidth + assetWidth;
		}
	}

	if (currentRow.length > 0) {
		rows.push({assets: currentRow, height: TARGET_ROW_HEIGHT});
	}

	const totalHeight = rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * GAP;

	return {rows, totalHeight};
}

export function calculateBucketHeight(ratios: number[], viewportWidth: number): number {
	const HEADER_HEIGHT = 90;
	const HEADER_MARGIN = 40;

	if (ratios.length === 0) return HEADER_HEIGHT;

	const layout = calculateJustifiedLayout(ratios, viewportWidth);

	return HEADER_HEIGHT + layout.totalHeight + HEADER_MARGIN;
}
