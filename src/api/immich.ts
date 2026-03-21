import type {ImmichAsset, GetAssetsParams, LoginResponse, TimelineBucket, ColumnarAssetResponse, GroupedAsset, GroupedAssetsResponse, GetBucketsParams, GroupedAssetsPage, BucketMetadata, ImmichAlbum, ImmichAlbumDetails} from './types';
import FormattingService from '../utils/FormattingService';
import {APIClient} from './client';
import {AssetType} from './types';
import {BUCKETS_PER_PAGE} from '../hooks/queryConfig';

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

	public groupAssetsByDay(assets: ImmichAsset[]): GroupedAsset[] {
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
				displayDate: FormattingService.formatBucketDate(date),
				assets: groupAssets,
				count: groupAssets.length,
			}));

		return groups;
	}

	private transformColumnarResponse(columnar: ColumnarAssetResponse): ImmichAsset[] {
		return columnar.id.map((id, i) => ({
			id: id,
			deviceAssetId: id,
			ownerId: columnar.ownerId[i],
			deviceId: '',
			type: columnar.isImage[i] ? AssetType.IMAGE : AssetType.VIDEO,
			originalPath: '',
			originalFileName: '',
			resized: true,
			thumbhash: columnar.thumbhash[i],
			fileCreatedAt: columnar.fileCreatedAt[i],
			fileModifiedAt: columnar.fileCreatedAt[i],
			updatedAt: columnar.fileCreatedAt[i],
			isFavorite: columnar.isFavorite[i],
			isArchived: columnar.isTrashed[i],
			mimeType: columnar.isImage[i] ? 'image/jpeg' : 'video/mp4',
			duration: columnar.duration[i],
			livePhotoVideoId: columnar.livePhotoVideoId[i],
			tags: [],
		}));
	}

	public async getBucketData(timeBucket: string): Promise<{assets: ImmichAsset[]; ratios: number[]}> {
		const columnar = await this.client.fetch<ColumnarAssetResponse>(`/timeline/bucket?timeBucket=${timeBucket}`);
		return {
			assets: this.transformColumnarResponse(columnar),
			ratios: columnar.ratio?.length ? columnar.ratio : columnar.id.map(() => 1),
		};
	}

	public async getBucketAssets(timeBucket: string): Promise<ImmichAsset[]> {
		const {assets} = await this.getBucketData(timeBucket);
		return assets;
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
		return this.client.fetch('/users/me').then(() => true).catch(() => false);
	}

	public async validateConnection(): Promise<boolean> {
		return this.client.fetch('/server/ping').then(() => true).catch(() => false);
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

	public async getAlbums(): Promise<ImmichAlbum[]> {
		return this.client.fetch<ImmichAlbum[]>('/albums');
	}

	public async getAlbumDetails(albumId: string): Promise<ImmichAlbumDetails> {
		return this.client.fetch<ImmichAlbumDetails>(`/albums/${albumId}`);
	}

	public getAlbumThumbnailUrl(albumThumbnailAssetId: string): string {
		return this.client.getThumbnailUrl(albumThumbnailAssetId, 'thumbnail');
	}

	public async getGroupedAssets(params: GetAssetsParams = {}): Promise<GroupedAssetsResponse> {
		const buckets = await this.getBuckets();
		const recentBuckets = buckets.slice(0, 10);
		const bucketAssets = await Promise.all(recentBuckets.map((bucket) => this.getBucketAssets(bucket.timeBucket)));
		const allAssets = bucketAssets.flat();

		let filteredGroups = this.groupAssetsByDay(allAssets);

		const applyFilter = (groups: GroupedAsset[], predicate: (asset: ImmichAsset) => boolean): GroupedAsset[] => {
			return groups
				.map((g) => {
					const assets = g.assets.filter(predicate);
					return {...g, assets, count: assets.length};
				})
				.filter((g) => g.count > 0);
		};

		if (params.isFavorite !== undefined) {
			filteredGroups = applyFilter(filteredGroups, (a) => a.isFavorite === params.isFavorite);
		}
		if (params.isArchived !== undefined) {
			filteredGroups = applyFilter(filteredGroups, (a) => a.isArchived === params.isArchived);
		}

		return {groups: filteredGroups, totalAssets: filteredGroups.reduce((sum, g) => sum + g.count, 0)};
	}

	public async getGroupedAssetsPageWithBuckets(allBuckets: TimelineBucket[], params: GetBucketsParams = {}): Promise<GroupedAssetsPage> {
		const skip = params.skip || 0;
		const take = params.take || BUCKETS_PER_PAGE;

		const pageBuckets = allBuckets.slice(skip, skip + take);
		const bucketDataArray = await Promise.all(pageBuckets.map((bucket) => this.getBucketData(bucket.timeBucket)));

		// Build per-day ratio map before groupAssetsByDay loses asset order
		const dayRatiosMap = new Map<string, number[]>();
		bucketDataArray.forEach(({assets, ratios}) => {
			assets.forEach((asset, i) => {
				const day = this.getAssetDate(asset);
				if (!dayRatiosMap.has(day)) dayRatiosMap.set(day, []);
				dayRatiosMap.get(day)!.push(ratios[i]);
			});
		});

		const allAssets = bucketDataArray.flatMap((d) => d.assets);
		const dailyGroups = this.groupAssetsByDay(allAssets);
		const nonEmptyGroups = dailyGroups.filter((g) => g.count > 0);

		const metadataMap = new Map<string, BucketMetadata>();
		dayRatiosMap.forEach((ratios, day) => {
			metadataMap.set(day, {date: day, ids: [], ratios, count: ratios.length});
		});

		return {
			groups: nonEmptyGroups,
			totalAssets: nonEmptyGroups.reduce((sum, g) => sum + g.count, 0),
			nextCursor: skip + take < allBuckets.length ? skip + take : undefined,
			hasMore: skip + take < allBuckets.length,
			metadataMap,
		};
	}
}
