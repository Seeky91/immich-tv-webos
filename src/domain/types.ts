type AssetType = 'IMAGE' | 'VIDEO';

export interface TimelineAsset {
	id: string;
	type: AssetType;
	ratio: number;
	fileCreatedAt: string;
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

export interface TimelinePage {
	groups: DayGroup[];
	totalAssets: number;
	nextCursor?: number;
	hasMore: boolean;
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
	assets: TimelineAsset[];
	order: AssetOrder;
}

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
