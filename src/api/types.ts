import type {AssetOrder} from '../domain/types';

export enum AuthMethod {
	USER_CREDENTIALS = 'USER_CREDENTIALS',
	API_KEY = 'API_KEY',
}

interface BaseAuthConfig {
	baseUrl: string;
	method: AuthMethod;
}

export interface UserCredentialsConfig extends BaseAuthConfig {
	method: typeof AuthMethod.USER_CREDENTIALS;
	email: string;
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
	// "H:MM:SS.mmm" on Immich < v2, milliseconds on newer servers
	duration: string | number | null;
	exifInfo?: ExifInfo;
}

interface ExifInfo {
	exifImageWidth?: number;
	exifImageHeight?: number;
}

export interface ColumnarAssetResponse {
	id: string[];
	duration: (string | number | null)[];
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
