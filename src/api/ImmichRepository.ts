import type {APIClient} from './client';
import type {ColumnarAssetResponse, ImmichAlbum, ImmichAlbumDetails, ImmichAsset, ImmichPerson, PeopleResponse} from './types';
import type {PhotoRepository} from '../domain/PhotoRepository';
import type {Album, AlbumDetails, Person, TimelineAsset, TimelineBucket, TimelinePage} from '../domain/types';
import {groupAssetsByDay, transformColumnarResponse} from '../domain/transforms';

interface ImmichSearchResponse {
	assets: {items: ImmichAsset[]};
}

const PEOPLE_LIMIT = 50;

export class ImmichRepository implements PhotoRepository {
	private client: APIClient;

	constructor(client: APIClient) {
		this.client = client;
	}

	private mapAlbum(a: ImmichAlbum): Album {
		return {
			id: a.id,
			albumName: a.albumName,
			description: a.description,
			albumThumbnailAssetId: a.albumThumbnailAssetId,
			assetCount: a.assetCount,
		};
	}

	private mapPerson(p: ImmichPerson): Person {
		return {id: p.id, name: p.name, assetCount: p.assetCount};
	}

	public async getBuckets(): Promise<TimelineBucket[]> {
		return this.client.fetch<TimelineBucket[]>('/timeline/buckets');
	}

	public async getTimelinePage(allBuckets: TimelineBucket[], skip: number, take: number): Promise<TimelinePage> {
		const pageBuckets = allBuckets.slice(skip, skip + take);
		const bucketAssets = await Promise.all(pageBuckets.map((b) => this.fetchBucket(b.timeBucket)));
		const allAssets = bucketAssets.flat();
		const groups = groupAssetsByDay(allAssets);

		return {
			groups,
			totalAssets: groups.reduce((sum, g) => sum + g.count, 0),
			nextCursor: skip + take < allBuckets.length ? skip + take : undefined,
			hasMore: skip + take < allBuckets.length,
		};
	}

	private async fetchBucket(timeBucket: string): Promise<TimelineAsset[]> {
		const columnar = await this.client.fetch<ColumnarAssetResponse>(`/timeline/bucket?timeBucket=${timeBucket}`);
		return transformColumnarResponse(columnar);
	}

	public async getAlbums(): Promise<Album[]> {
		const albums = await this.client.fetch<ImmichAlbum[]>('/albums');
		return albums.map((a) => this.mapAlbum(a));
	}

	public async getAlbum(albumId: string): Promise<AlbumDetails> {
		const details = await this.client.fetch<ImmichAlbumDetails>(`/albums/${albumId}`);
		return {
			...this.mapAlbum(details),
			assets: details.assets.map((a) => this.assetFromImmichAsset(a)),
		};
	}

	private assetFromImmichAsset(a: ImmichAsset): TimelineAsset {
		const w = a.exifInfo?.exifImageWidth;
		const h = a.exifInfo?.exifImageHeight;
		return {
			id: a.id,
			type: a.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
			ratio: w && h ? w / h : 1,
			fileCreatedAt: a.fileCreatedAt,
			duration: a.duration ?? null,
		};
	}

	public async getPeople(): Promise<Person[]> {
		const response = await this.client.fetch<PeopleResponse>('/people');
		return response.people
			.filter((p) => !p.isHidden)
			.sort((a, b) => b.assetCount - a.assetCount)
			.slice(0, PEOPLE_LIMIT)
			.map((p) => this.mapPerson(p));
	}

	public async searchSmart(query: string): Promise<TimelineAsset[]> {
		const response = await this.client.fetch<ImmichSearchResponse>('/search/smart', {
			method: 'POST',
			body: JSON.stringify({query, size: 500}),
		});
		return this.searchItemsToAssets(response);
	}

	public async searchByPerson(personId: string): Promise<TimelineAsset[]> {
		const response = await this.client.fetch<ImmichSearchResponse>('/search/metadata', {
			method: 'POST',
			body: JSON.stringify({personIds: [personId], size: 500}),
		});
		return this.searchItemsToAssets(response);
	}

	private searchItemsToAssets(response: ImmichSearchResponse): TimelineAsset[] {
		const items = response.assets?.items;
		if (!Array.isArray(items)) return [];
		return items.map((a) => this.assetFromImmichAsset(a));
	}

	public thumbnailUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'thumbnail');
	}

	public previewUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'preview');
	}

	public originalUrl(assetId: string): string {
		return this.client.getAssetUrl(assetId);
	}

	public faceUrl(personId: string): string {
		return this.client.getFaceThumbnailUrl(personId);
	}

	public albumThumbnailUrl(thumbnailAssetId: string): string {
		return this.client.getThumbnailUrl(thumbnailAssetId, 'thumbnail');
	}
}

export async function validateAuth(client: APIClient): Promise<boolean> {
	return client.fetch('/users/me').then(() => true).catch(() => false);
}
