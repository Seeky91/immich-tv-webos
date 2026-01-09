// Authentication
export const AuthMethod = {
	USER_CREDENTIALS: 'USER_CREDENTIALS',
	API_KEY: 'API_KEY',
} as const;

// eslint-disable-next-line no-redeclare
export type AuthMethod = (typeof AuthMethod)[keyof typeof AuthMethod];

// Base config
export interface BaseAuthConfig {
	baseUrl: string;
	method: AuthMethod;
}

// User credentials config
export interface UserCredentialsConfig extends BaseAuthConfig {
	method: typeof AuthMethod.USER_CREDENTIALS;
	email: string;
	password: string; // Only used during login, never stored
	accessToken?: string; // Set after successful login
}

// API key config
export interface ApiKeyConfig extends BaseAuthConfig {
	method: typeof AuthMethod.API_KEY;
	apiKey: string;
}

// Union type for all auth configurations
export type AuthConfig = UserCredentialsConfig | ApiKeyConfig;

// Login API types
export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	accessToken: string;
	userId: string;
	userEmail: string;
	name: string;
	profileImagePath: string;
}

// Asset Types
export const AssetType = {
	IMAGE: 'IMAGE',
	VIDEO: 'VIDEO',
	AUDIO: 'AUDIO',
	OTHER: 'OTHER',
} as const;

// eslint-disable-next-line no-redeclare
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

// Core Asset Interface
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

// EXIF Information
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

// API Response Types
export interface AssetResponse {
	count: number;
	assets: ImmichAsset[];
	nextCursor?: string;
}

export interface ThumbnailSize {
	width: number;
	height: number;
}

// Query Parameters
export interface GetAssetsParams {
	skip?: number;
	take?: number;
	userId?: string;
	isFavorite?: boolean;
	isArchived?: boolean;
	updatedAfter?: string;
	updatedBefore?: string;
}

// Timeline Bucket Size
export const TimeBucketSize = {
	DAY: 'DAY',
	MONTH: 'MONTH',
	YEAR: 'YEAR',
} as const;

// eslint-disable-next-line no-redeclare
export type TimeBucketSize =
	(typeof TimeBucketSize)[keyof typeof TimeBucketSize];

// Timeline Bucket Interface
export interface TimelineBucket {
	timeBucket: string; // Format: "YYYY-MM-DD"
	count: number; // Number of assets in this bucket
}

// Columnar Asset Response (Immich API format)
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

// Grouped Assets by Date
export interface GroupedAsset {
	timeBucket: string; // "YYYY-MM-DD"
	displayDate: string; // "Monday, Dec 30, 2024"
	assets: ImmichAsset[];
	count: number;
}

export interface GroupedAssetsResponse {
	groups: GroupedAsset[];
	totalAssets: number;
}

// Pagination parameters for bucket fetching
export interface GetBucketsParams {
	skip?: number; // Number of buckets to skip
	take?: number; // Number of buckets to fetch (default: 5)
}

// Page response with metadata for infinite scroll
export interface GroupedAssetsPage {
	groups: GroupedAsset[];
	totalAssets: number;
	nextCursor?: number; // Index of next bucket to fetch
	hasMore: boolean; // Whether more buckets exist
}

// List item types for flattened grid with headers
export type ListItem =
	| {type: 'header'; date: string; displayDate: string; count: number}
	| {type: 'asset'; asset: ImmichAsset; date: string};
