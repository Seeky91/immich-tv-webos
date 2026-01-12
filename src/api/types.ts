export enum AuthMethod {
	USER_CREDENTIALS = 'USER_CREDENTIALS',
	API_KEY = 'API_KEY',
}

export enum AssetType {
	IMAGE = 'IMAGE',
	VIDEO = 'VIDEO',
	AUDIO = 'AUDIO',
	OTHER = 'OTHER',
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

export interface LoginResponse {
	accessToken: string;
	userId: string;
	userEmail: string;
	name: string;
	profileImagePath: string;
}

export interface ImmichAsset {
	id: string;
	deviceAssetId: string;
	ownerId: string;
	deviceId: string;
	type: AssetType;
	originalPath: string;
	originalFileName: string;
	resized: boolean;
	thumbhash: string | null;
	fileCreatedAt: string;
	fileModifiedAt: string;
	updatedAt: string;
	isFavorite: boolean;
	isArchived: boolean;
	mimeType: string;
	duration: string | null;
	exifInfo?: ExifInfo;
	livePhotoVideoId?: string | null;
	tags: string[];
}

export interface ExifInfo {
	make?: string;
	model?: string;
	exifImageWidth?: number;
	exifImageHeight?: number;
	fileSizeInByte?: number;
	orientation?: string;
	dateTimeOriginal?: string;
	modifyDate?: string;
	timeZone?: string;
	lensModel?: string;
	fNumber?: number;
	focalLength?: number;
	iso?: number;
	exposureTime?: string;
	latitude?: number;
	longitude?: number;
	city?: string;
	state?: string;
	country?: string;
}

export interface AssetResponse {
	count: number;
	assets: ImmichAsset[];
	nextCursor?: string;
}

export interface GetAssetsParams {
	skip?: number;
	take?: number;
	userId?: string;
	isFavorite?: boolean;
	isArchived?: boolean;
	updatedAfter?: string;
	updatedBefore?: string;
}

export interface TimelineBucket {
	timeBucket: string;
	count: number;
}

export interface BucketMetadata {
	date: string;
	ids: string[];
	ratios: number[];
	count: number;
}

export interface ColumnarAssetResponse {
	id: string[];
	city: (string | null)[];
	country: (string | null)[];
	duration: (string | null)[];
	visibility: string[];
	isFavorite: boolean[];
	isImage: boolean[];
	isTrashed: boolean[];
	livePhotoVideoId: (string | null)[];
	fileCreatedAt: string[];
	localOffsetHours: number[];
	ownerId: string[];
	projectionType: (string | null)[];
	ratio: number[];
	status: string[];
	thumbhash: (string | null)[];
}

export interface GroupedAsset {
	timeBucket: string;
	displayDate: string;
	assets: ImmichAsset[];
	count: number;
}

export interface GroupedAssetsResponse {
	groups: GroupedAsset[];
	totalAssets: number;
}

export interface GetBucketsParams {
	skip?: number;
	take?: number;
}

export interface GroupedAssetsPage {
	groups: GroupedAsset[];
	totalAssets: number;
	nextCursor?: number;
	hasMore: boolean;
}

export type AuthConfig = UserCredentialsConfig | ApiKeyConfig;
