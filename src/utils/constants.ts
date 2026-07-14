export const TARGET_ROW_HEIGHT_PX = 400;
export const GRID_GAP_PX = 8;
export const GRID_HORIZONTAL_PADDING_PX = 80;
export const GRID_INSET_LEFT_PX = 72;
export const GRID_INSET_RIGHT_PX = 40;
export const ESTIMATED_ROW_HEIGHT_PX = 510;
export const BUCKET_HEADER_HEIGHT_PX = 128;
export const BUCKET_HEADER_MARGIN_PX = 40;
// Runtime CSS px at FHD. Must match .rail width in NavigationRail.module.less,
// which is authored in 4K-space px (360px there = 180 CSS px at FHD).
export const SIDEBAR_WIDTH = 180;
export const NAVIGATION_RAIL_SPOTLIGHT_ID = 'navigation-rail';
// Authored 4K-space px (ri.scale(240) renders a 120 CSS px rail at FHD). Must match
// .scrubberHost width in DateScrubber.module.less — TimelineGrid subtracts it from gridWidth.
export const DATE_SCRUBBER_WIDTH_PX = 240;
export const DATE_SCRUBBER_SPOTLIGHT_ID = 'date-scrubber';
