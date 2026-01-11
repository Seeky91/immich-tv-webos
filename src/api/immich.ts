import type {ImmichAsset, GetAssetsParams, LoginResponse, TimelineBucket, ColumnarAssetResponse, GroupedAsset, GroupedAssetsResponse, GetBucketsParams, GroupedAssetsPage} from './types';
import {formatBucketDate} from '../utils/dateFormatter';
import {APIClient} from './client';
import {AssetType} from './types';

export class ImmichAPI {
	private client: APIClient;

	constructor(client: APIClient) {
		this.client = client;
	}

	public async getBuckets(): Promise<TimelineBucket[]> {
		return this.client.fetch<TimelineBucket[]>(`/timeline/buckets`);
	}

	private getAssetDate(asset: ImmichAsset): string {
		const date = new Date(asset.fileCreatedAt);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	private groupAssetsByDay(assets: ImmichAsset[]): GroupedAsset[] {
		const dayMap = new Map<string, ImmichAsset[]>();

		for (const asset of assets) {
			const dateKey = this.getAssetDate(asset);
			if (!dayMap.has(dateKey)) {
				dayMap.set(dateKey, []);
			}
			dayMap.get(dateKey)!.push(asset);
		}

		const groups: GroupedAsset[] = Array.from(dayMap.entries())
			.sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
			.map(([date, groupAssets]) => ({
				timeBucket: date,
				displayDate: formatBucketDate(date),
				assets: groupAssets,
				count: groupAssets.length,
			}));

		return groups;
	}

	private transformColumnarResponse(columnar: ColumnarAssetResponse): ImmichAsset[] {
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

	public async getBucketAssets(timeBucket: string): Promise<ImmichAsset[]> {
		const columnar = await this.client.fetch<ColumnarAssetResponse>(`/timeline/bucket?timeBucket=${timeBucket}`);
		return this.transformColumnarResponse(columnar);
	}

	public async getAssets(params: GetAssetsParams = {}): Promise<ImmichAsset[]> {
		const buckets = await this.getBuckets();
		const recentBuckets = buckets.slice(0, 10);

		const assetArrays = await Promise.all(recentBuckets.map((bucket) => this.getBucketAssets(bucket.timeBucket)));
		const allAssets = assetArrays.flat();

		let filteredAssets = allAssets;
		if (params.isFavorite !== undefined) {
			filteredAssets = filteredAssets.filter((a) => a.isFavorite === params.isFavorite);
		}
		if (params.isArchived !== undefined) {
			filteredAssets = filteredAssets.filter((a) => a.isArchived === params.isArchived);
		}

		const limit = params.take || 500;
		return filteredAssets.slice(params.skip || 0, (params.skip || 0) + limit);
	}

	public async getAsset(assetId: string): Promise<ImmichAsset> {
		return this.client.fetch<ImmichAsset>(`/assets/${assetId}`);
	}

	public async login(email: string, password: string): Promise<LoginResponse> {
		const response = await this.client.fetch<LoginResponse>('/auth/login', {method: 'POST', body: JSON.stringify({email, password})});
		return response;
	}

	public async validateUserAuth(): Promise<boolean> {
		try {
			await this.client.fetch('/users/me');
			return true;
		} catch {
			return false;
		}
	}

	public async validateConnection(): Promise<boolean> {
		try {
			await this.client.fetch('/server/ping');
			return true;
		} catch {
			return false;
		}
	}

	public getThumbnailUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'thumbnail');
	}

	public getPreviewUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'preview');
	}

	public getOriginalUrl(assetId: string): string {
		return this.client.getAssetUrl(assetId);
	}

	public async getGroupedAssets(params: GetAssetsParams = {}): Promise<GroupedAssetsResponse> {
		const buckets = await this.getBuckets();
		const recentBuckets = buckets.slice(0, 10);
		const bucketAssets = await Promise.all(recentBuckets.map((bucket) => this.getBucketAssets(bucket.timeBucket)));
		const allAssets = bucketAssets.flat();

		let filteredGroups = this.groupAssetsByDay(allAssets);

		if (params.isFavorite !== undefined) {
			filteredGroups = filteredGroups
				.map((g) => ({
					...g,
					assets: g.assets.filter((a: ImmichAsset) => a.isFavorite === params.isFavorite),
					count: g.assets.filter((a: ImmichAsset) => a.isFavorite === params.isFavorite).length,
				}))
				.filter((g) => g.count > 0);
		}
		if (params.isArchived !== undefined) {
			filteredGroups = filteredGroups
				.map((g) => ({
					...g,
					assets: g.assets.filter((a: ImmichAsset) => a.isArchived === params.isArchived),
					count: g.assets.filter((a: ImmichAsset) => a.isArchived === params.isArchived).length,
				}))
				.filter((g) => g.count > 0);
		}

		return {
			groups: filteredGroups,
			totalAssets: filteredGroups.reduce((sum, g) => sum + g.count, 0),
		};
	}

	public async getGroupedAssetsPage(params: GetBucketsParams = {}): Promise<GroupedAssetsPage> {
		const allBuckets = await this.getBuckets();

		const skip = params.skip || 0;
		const take = params.take || 5;

		const pageBuckets = allBuckets.slice(skip, skip + take);
		const bucketAssets = await Promise.all(pageBuckets.map((bucket) => this.getBucketAssets(bucket.timeBucket)));
		const allAssets = bucketAssets.flat();

		const dailyGroups = this.groupAssetsByDay(allAssets);
		const nonEmptyGroups = dailyGroups.filter((g) => g.count > 0);

		return {
			groups: nonEmptyGroups,
			totalAssets: nonEmptyGroups.reduce((sum, g) => sum + g.count, 0),
			nextCursor: skip + take < allBuckets.length ? skip + take : undefined,
			hasMore: skip + take < allBuckets.length,
		};
	}
}
