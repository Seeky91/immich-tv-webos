export type View = 'photos' | 'albums' | 'places' | 'search';

/** Shared props for every route-level panel mounted by AppLayout. */
export interface RoutePanelProps {
	contentWidth: number;
}
