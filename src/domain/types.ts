type AssetType = 'IMAGE' | 'VIDEO';

export interface TimelineAsset {
	id: string;
	type: AssetType;
	ratio: number;
	// Local wall-clock time; day grouping must use it to match the server's month buckets,
	// which are cut on localDateTime, not UTC.
	localDateTime: string;
	durationSeconds: number | null;
}

export interface TimelineBucket {
	timeBucket: string;
	count: number;
}

export interface DayGroup {
	timeBucket: string;
	assets: TimelineAsset[];
	count: number;
}

export interface Album {
	id: string;
	albumName: string;
	description: string;
	albumThumbnailAssetId: string | null;
	assetCount: number;
}

export type AssetOrder = 'asc' | 'desc';

export interface AlbumDetails extends Album {
	order: AssetOrder;
}

// The empty scope is the main library timeline.
export interface TimelineScope {
	albumId?: string;
	personId?: string;
	order?: AssetOrder;
}

export const MAIN_TIMELINE: TimelineScope = {};

export interface Place {
	city: string;
	country: string | null;
	thumbnailAssetId: string;
}

export interface Person {
	id: string;
	name: string;
	assetCount: number;
}
