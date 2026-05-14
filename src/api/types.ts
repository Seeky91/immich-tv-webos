export enum AuthMethod {
	USER_CREDENTIALS = 'USER_CREDENTIALS',
	API_KEY = 'API_KEY',
}

export interface BaseAuthConfig {
	baseUrl: string;
	method: AuthMethod;
}

export interface UserCredentialsConfig extends BaseAuthConfig {
	method: typeof AuthMethod.USER_CREDENTIALS;
	email: string;
	password: string;
	accessToken?: string;
}

export interface ApiKeyConfig extends BaseAuthConfig {
	method: typeof AuthMethod.API_KEY;
	apiKey: string;
}

export type AuthConfig = UserCredentialsConfig | ApiKeyConfig;

export interface ImmichAsset {
	id: string;
	type: string;
	fileCreatedAt: string;
	duration: string | null;
	exifInfo?: ExifInfo;
}

export interface ExifInfo {
	exifImageWidth?: number;
	exifImageHeight?: number;
}

export interface ColumnarAssetResponse {
	id: string[];
	duration: (string | null)[];
	isImage: boolean[];
	fileCreatedAt: string[];
	ownerId: string[];
	ratio: number[];
	thumbhash: (string | null)[];
	isFavorite: boolean[];
	isTrashed: boolean[];
	livePhotoVideoId: (string | null)[];
}

export interface ImmichAlbum {
	id: string;
	albumName: string;
	description: string;
	albumThumbnailAssetId: string | null;
	assetCount: number;
}

export type AssetOrder = 'asc' | 'desc';

export interface ImmichAlbumDetails extends ImmichAlbum {
	assets: ImmichAsset[];
	order?: AssetOrder;
}

export interface ImmichPerson {
	id: string;
	name: string;
	assetCount: number;
	isHidden: boolean;
}

export interface PeopleResponse {
	people: ImmichPerson[];
}
