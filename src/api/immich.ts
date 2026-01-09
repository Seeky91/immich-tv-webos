import {APIClient} from './client';
import type {
	ImmichAsset,
	GetAssetsParams,
	LoginResponse,
	TimelineBucket,
	ColumnarAssetResponse,
	GroupedAssetsResponse,
	GetBucketsParams,
	GroupedAssetsPage,
} from './types';
import {AssetType} from './types';

export class ImmichAPI {
	private client: APIClient;

	constructor(client: APIClient) {
		this.client = client;
	}

	// Fetch timeline buckets (date groups)
	public async getBuckets(size: string = 'DAY'): Promise<TimelineBucket[]> {
		return this.client.fetch<TimelineBucket[]>(
			`/timeline/buckets?size=${size}`
		);
	}

	// Transform columnar response to row-based array
	private transformColumnarResponse(
		columnar: ColumnarAssetResponse
	): ImmichAsset[] {
		const count = columnar.id.length;
		const assets: ImmichAsset[] = [];

		for (let i = 0; i < count; i++) {
			assets.push({
				id: columnar.id[i],
				deviceAssetId: columnar.id[i], // Use id as deviceAssetId
				ownerId: columnar.ownerId[i],
				deviceId: '', // Not provided in columnar response
				type: columnar.isImage[i] ? AssetType.IMAGE : AssetType.VIDEO,
				originalPath: '', // Not provided in columnar response
				originalFileName: '', // Not provided in columnar response
				resized: true, // Assume true
				thumbhash: columnar.thumbhash[i],
				fileCreatedAt: columnar.fileCreatedAt[i],
				fileModifiedAt: columnar.fileCreatedAt[i], // Use fileCreatedAt as fallback
				updatedAt: columnar.fileCreatedAt[i], // Use fileCreatedAt as fallback
				isFavorite: columnar.isFavorite[i],
				isArchived: columnar.isTrashed[i],
				mimeType: columnar.isImage[i] ? 'image/jpeg' : 'video/mp4', // Approximate
				duration: columnar.duration[i],
				livePhotoVideoId: columnar.livePhotoVideoId[i],
				tags: [],
			});
		}

		return assets;
	}

	// Fetch assets for a specific bucket
	public async getBucketAssets(timeBucket: string): Promise<ImmichAsset[]> {
		const columnar = await this.client.fetch<ColumnarAssetResponse>(
			`/timeline/bucket?timeBucket=${timeBucket}`
		);
		return this.transformColumnarResponse(columnar);
	}

	// Fetch all assets (orchestrates bucket fetching)
	public async getAssets(params: GetAssetsParams = {}): Promise<ImmichAsset[]> {
		// Step 1: Get buckets
		const buckets = await this.getBuckets();

		// Step 2: Fetch assets for first 10 buckets (most recent photos)
		const recentBuckets = buckets.slice(0, 10);

		const assetArrays = await Promise.all(
			recentBuckets.map((bucket) => this.getBucketAssets(bucket.timeBucket))
		);

		// Step 3: Flatten and return
		const allAssets = assetArrays.flat();

		// Apply filters if needed
		let filteredAssets = allAssets;
		if (params.isFavorite !== undefined) {
			filteredAssets = filteredAssets.filter(
				(a) => a.isFavorite === params.isFavorite
			);
		}
		if (params.isArchived !== undefined) {
			filteredAssets = filteredAssets.filter(
				(a) => a.isArchived === params.isArchived
			);
		}

		// Apply take limit
		const limit = params.take || 500;
		return filteredAssets.slice(params.skip || 0, (params.skip || 0) + limit);
	}

	// Get single asset details
	public async getAsset(assetId: string): Promise<ImmichAsset> {
		return this.client.fetch<ImmichAsset>(`/assets/${assetId}`);
	}

	// Login with user credentials
	public async login(email: string, password: string): Promise<LoginResponse> {
		const response = await this.client.fetch<LoginResponse>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({email, password}),
		});
		return response;
	}

	// Validate user auth token
	public async validateUserAuth(): Promise<boolean> {
		try {
			await this.client.fetch('/users/me');
			return true;
		} catch {
			return false;
		}
	}

	// Validate API connection
	public async validateConnection(): Promise<boolean> {
		try {
			await this.client.fetch('/server/ping');
			return true;
		} catch {
			return false;
		}
	}

	// Get thumbnail URL (convenience method)
	public getThumbnailUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'thumbnail');
	}

	// Get preview URL (higher quality for viewer)
	public getPreviewUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'preview');
	}

	// Get original asset URL
	public getOriginalUrl(assetId: string): string {
		return this.client.getAssetUrl(assetId);
	}

	// Format bucket date to human-readable string
	private formatBucketDate(timeBucket: string): string {
		// Parse as local date (not UTC) by using Date constructor with components
		const [year, month, day] = timeBucket.split('-').map(Number);
		const date = new Date(year, month - 1, day); // Month is 0-indexed

		const today = new Date();
		today.setHours(0, 0, 0, 0); // Normalize to midnight for comparison

		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const dateNormalized = new Date(date);
		dateNormalized.setHours(0, 0, 0, 0);

		// Compare timestamps (avoids toDateString timezone issues)
		if (dateNormalized.getTime() === today.getTime()) return 'Today';
		if (dateNormalized.getTime() === yesterday.getTime()) return 'Yesterday';

		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}

	// Fetch grouped assets by date
	public async getGroupedAssets(
		params: GetAssetsParams = {}
	): Promise<GroupedAssetsResponse> {
		// Step 1: Get buckets
		const buckets = await this.getBuckets();
		const recentBuckets = buckets.slice(0, 10);

		// Step 2: Fetch assets for each bucket in parallel
		const groups = await Promise.all(
			recentBuckets.map(async (bucket) => {
				const assets = await this.getBucketAssets(bucket.timeBucket);
				return {
					timeBucket: bucket.timeBucket,
					displayDate: this.formatBucketDate(bucket.timeBucket),
					assets,
					count: assets.length,
				};
			})
		);

		// Step 3: Apply filters
		let filteredGroups = groups;
		if (params.isFavorite !== undefined) {
			filteredGroups = groups
				.map((g) => ({
					...g,
					assets: g.assets.filter((a) => a.isFavorite === params.isFavorite),
					count: g.assets.filter((a) => a.isFavorite === params.isFavorite)
						.length,
				}))
				.filter((g) => g.count > 0);
		}
		if (params.isArchived !== undefined) {
			filteredGroups = filteredGroups
				.map((g) => ({
					...g,
					assets: g.assets.filter((a) => a.isArchived === params.isArchived),
					count: g.assets.filter((a) => a.isArchived === params.isArchived)
						.length,
				}))
				.filter((g) => g.count > 0);
		}

		return {
			groups: filteredGroups,
			totalAssets: filteredGroups.reduce((sum, g) => sum + g.count, 0),
		};
	}

	// Fetch grouped assets page with pagination (for infinite scroll)
	public async getGroupedAssetsPage(
		params: GetBucketsParams = {}
	): Promise<GroupedAssetsPage> {
		// Step 1: Get ALL buckets (needed to know total count)
		const allBuckets = await this.getBuckets('DAY'); // Explicitly request daily buckets

		const skip = params.skip || 0;
		const take = params.take || 5; // 5 buckets per page (~50 assets)

		// Step 2: Slice buckets for current page
		const pageBuckets = allBuckets.slice(skip, skip + take);

		// Step 3: Fetch assets for each bucket in parallel
		const groups = await Promise.all(
			pageBuckets.map(async (bucket) => {
				const assets = await this.getBucketAssets(bucket.timeBucket);
				return {
					timeBucket: bucket.timeBucket,
					displayDate: this.formatBucketDate(bucket.timeBucket),
					assets,
					count: assets.length,
				};
			})
		);

		// Step 4: Filter out empty groups (edge case: deleted/archived assets)
		const nonEmptyGroups = groups.filter((g) => g.count > 0);

		// Step 5: Return page with pagination metadata
		return {
			groups: nonEmptyGroups,
			totalAssets: nonEmptyGroups.reduce((sum, g) => sum + g.count, 0),
			nextCursor: skip + take < allBuckets.length ? skip + take : undefined,
			hasMore: skip + take < allBuckets.length,
		};
	}
}
