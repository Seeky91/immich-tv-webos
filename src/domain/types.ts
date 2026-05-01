export type AssetType = 'IMAGE' | 'VIDEO';

export interface TimelineAsset {
	id: string;
	type: AssetType;
	ratio: number;
	fileCreatedAt: string;
	duration: string | null;
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

export interface AlbumDetails extends Album {
	assets: TimelineAsset[];
}

export interface Person {
	id: string;
	name: string;
	assetCount: number;
}
