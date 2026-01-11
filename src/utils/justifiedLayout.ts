export interface LayoutRow {
	assets: number[]; // Indices of assets in this row
	height: number; // Row height in pixels
}

export interface JustifiedLayoutResult {
	rows: LayoutRow[];
	totalHeight: number;
}

const TARGET_ROW_HEIGHT = 280; // Target height for rows (matches current design)
const GAP = 8; // Grid gap from MainPanel.module.less

/**
 * Calculate justified layout using aspect ratios
 * This is a simplified justified layout algorithm
 */
export function calculateJustifiedLayout(
	ratios: number[], // Asset aspect ratios (width/height)
	viewportWidth: number, // Container width
	padding: number = 80 // Horizontal padding (20px + 40px * 2 from CSS)
): JustifiedLayoutResult {
	const containerWidth = viewportWidth - padding;
	const rows: LayoutRow[] = [];
	let currentRow: number[] = [];
	let currentRowWidth = 0;

	for (let i = 0; i < ratios.length; i++) {
		const ratio = ratios[i];
		const assetWidth = TARGET_ROW_HEIGHT * ratio;

		// Check if adding this asset would overflow the row
		const gapWidth = currentRow.length > 0 ? GAP : 0;

		if (currentRowWidth + gapWidth + assetWidth > containerWidth && currentRow.length > 0) {
			// Finalize current row
			const availableWidth = containerWidth - (currentRow.length - 1) * GAP;
			const sumOfRatios = currentRow.reduce((sum, idx) => sum + ratios[idx], 0);
			const rowHeight = availableWidth / sumOfRatios;

			rows.push({
				assets: [...currentRow],
				height: rowHeight,
			});

			// Start new row
			currentRow = [i];
			currentRowWidth = assetWidth;
		} else {
			// Add to current row
			currentRow.push(i);
			currentRowWidth += gapWidth + assetWidth;
		}
	}

	// Finalize last row (don't justify, use target height)
	if (currentRow.length > 0) {
		rows.push({
			assets: currentRow,
			height: TARGET_ROW_HEIGHT,
		});
	}

	// Calculate total height: sum of row heights + gaps between rows
	const totalHeight = rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * GAP;

	return {rows, totalHeight};
}

/**
 * Calculate exact bucket height including header
 */
export function calculateBucketHeight(ratios: number[], viewportWidth: number): number {
	const HEADER_HEIGHT = 90; // DateHeader height (padding + font)
	const HEADER_MARGIN = 40; // Margin below date group

	if (ratios.length === 0) return HEADER_HEIGHT;

	const layout = calculateJustifiedLayout(ratios, viewportWidth);

	return HEADER_HEIGHT + layout.totalHeight + HEADER_MARGIN;
}
