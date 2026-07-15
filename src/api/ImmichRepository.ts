import {APIError, type APIClient} from './client';
import type {ColumnarAssetResponse, ImmichAlbum, ImmichAlbumDetails, ImmichAsset, ImmichPerson, PeopleResponse} from './types';
import type {PhotoRepository} from '../domain/PhotoRepository';
import type {Album, AlbumDetails, Person, Place, TimelineAsset, TimelineBucket} from '../domain/types';
import {toDurationSeconds} from '../utils/FormattingService';

interface ImmichSearchResponse {
	assets: {items: ImmichAsset[]};
}

const PEOPLE_LIMIT = 50;
const SEARCH_PAGE_SIZE = 500;
// Matches the official web client's main timeline: without visibility=timeline the server
// defaults to ('archive','timeline') and archived assets leak in.
const TIMELINE_FILTER_PARAMS = 'visibility=timeline&withPartners=true&withStacked=true';

const pad2 = (n: number): string => (n < 10 ? '0' + n : '' + n);
const pad3 = (n: number): string => (n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n);

// ISO-8601 UTC string, byte-identical to Date.toISOString for years 0000–9999. Hand-formatted via
// getUTC* (not toISOString) because this runs per asset on every month load and the timeline only
// reads it back as YYYY-MM / YYYY-MM-DD — skipping sub-second formatting drops ~27%/asset.
function utcMillisToIso(ms: number): string {
	const d = new Date(ms);
	return (
		String(d.getUTCFullYear()).padStart(4, '0') +
		'-' + pad2(d.getUTCMonth() + 1) +
		'-' + pad2(d.getUTCDate()) +
		'T' + pad2(d.getUTCHours()) +
		':' + pad2(d.getUTCMinutes()) +
		':' + pad2(d.getUTCSeconds()) +
		'.' + pad3(d.getUTCMilliseconds()) + 'Z'
	);
}

// The server buckets months on localDateTime but its columnar payload only carries UTC
// fileCreatedAt (+ localOffsetHours on recent servers, localDateTime array on older ones).
function columnarLocalDateTime(columnar: ColumnarAssetResponse, i: number): string {
	const fileCreatedAt = columnar.fileCreatedAt[i]!;
	const offsetHours = columnar.localOffsetHours?.[i];
	if (typeof offsetHours === 'number') {
		return utcMillisToIso(new Date(fileCreatedAt).getTime() + offsetHours * 3600 * 1000);
	}
	return columnar.localDateTime?.[i] ?? fileCreatedAt;
}

// Immich's bucket timeline returns assets column-wise (parallel arrays).
function transformColumnarResponse(columnar: ColumnarAssetResponse): TimelineAsset[] {
	const len = columnar.id.length;
	const ratios = columnar.ratio?.length === len ? columnar.ratio : null;
	return columnar.id.map((id, i) => ({
		id,
		type: columnar.isImage[i]! ? 'IMAGE' : 'VIDEO',
		ratio: ratios ? ratios[i]! : 1,
		localDateTime: columnarLocalDateTime(columnar, i),
		durationSeconds: toDurationSeconds(columnar.duration[i]),
	}));
}

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
		return {id: p.id, name: p.name, assetCount: p.assetCount ?? 0};
	}

	public async getBuckets(): Promise<TimelineBucket[]> {
		return this.client.fetch<TimelineBucket[]>(`/timeline/buckets?${TIMELINE_FILTER_PARAMS}`);
	}

	public async getBucketAssets(timeBucket: string, signal?: AbortSignal): Promise<TimelineAsset[]> {
		const columnar = await this.client.fetch<ColumnarAssetResponse>(
			`/timeline/bucket?timeBucket=${timeBucket}&${TIMELINE_FILTER_PARAMS}`,
			{signal}
		);
		return transformColumnarResponse(columnar);
	}

	// Album buckets are unfiltered on purpose: archived assets stay visible inside albums,
	// mirroring the official web client.
	private async fetchAlbumBucket(timeBucket: string, albumId: string): Promise<TimelineAsset[]> {
		const columnar = await this.client.fetch<ColumnarAssetResponse>(`/timeline/bucket?timeBucket=${timeBucket}&albumId=${albumId}`);
		return transformColumnarResponse(columnar);
	}

	public async getAlbums(): Promise<Album[]> {
		const albums = await this.client.fetch<ImmichAlbum[]>('/albums');
		return albums.map((a) => this.mapAlbum(a));
	}

	public async getAlbum(albumId: string): Promise<AlbumDetails> {
		const details = await this.client.fetch<ImmichAlbumDetails>(`/albums/${albumId}`);
		// Immich v3 no longer embeds assets in the album response; fetch them through the
		// timeline endpoints filtered by albumId instead.
		const assets = details.assets
			? details.assets.map((a) => this.assetFromImmichAsset(a))
			: await this.fetchAlbumAssetsViaTimeline(albumId);
		return {
			...this.mapAlbum(details),
			assets,
			order: details.order ?? 'desc',
		};
	}

	private async fetchAlbumAssetsViaTimeline(albumId: string): Promise<TimelineAsset[]> {
		const buckets = await this.client.fetch<TimelineBucket[]>(`/timeline/buckets?albumId=${albumId}`);
		const bucketAssets = await Promise.all(buckets.map((b) => this.fetchAlbumBucket(b.timeBucket, albumId)));
		return bucketAssets.flat();
	}

	private assetFromImmichAsset(a: ImmichAsset): TimelineAsset {
		const w = a.exifInfo?.exifImageWidth ?? a.width;
		const h = a.exifInfo?.exifImageHeight ?? a.height;
		return {
			id: a.id,
			type: a.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
			ratio: w && h ? w / h : 1,
			localDateTime: a.localDateTime ?? a.fileCreatedAt,
			durationSeconds: toDurationSeconds(a.duration),
		};
	}

	public async getPeople(): Promise<Person[]> {
		const response = await this.client.fetch<PeopleResponse>('/people');
		return response.people
			.filter((p) => !p.isHidden)
			.sort((a, b) => (b.assetCount ?? 0) - (a.assetCount ?? 0))
			.slice(0, PEOPLE_LIMIT)
			.map((p) => this.mapPerson(p));
	}

	public async getPlaces(): Promise<Place[]> {
		// One representative asset per city, exifInfo populated on every server version
		const assets = await this.client.fetch<ImmichAsset[]>('/search/cities');
		if (!Array.isArray(assets)) return [];
		return assets
			.flatMap((a) => {
				const city = a.exifInfo?.city;
				if (!city) return [];
				return [{city, country: a.exifInfo?.country ?? null, thumbnailAssetId: a.id}];
			})
			.sort((a, b) => a.city.localeCompare(b.city));
	}

	public async searchSmart(query: string): Promise<TimelineAsset[]> {
		const response = await this.client.fetch<ImmichSearchResponse>('/search/smart', {
			method: 'POST',
			body: JSON.stringify({query, size: SEARCH_PAGE_SIZE}),
		});
		return this.searchItemsToAssets(response);
	}

	public async searchByPerson(personId: string): Promise<TimelineAsset[]> {
		const response = await this.client.fetch<ImmichSearchResponse>('/search/metadata', {
			method: 'POST',
			body: JSON.stringify({personIds: [personId], size: SEARCH_PAGE_SIZE}),
		});
		return this.searchItemsToAssets(response);
	}

	public async searchByCity(city: string): Promise<TimelineAsset[]> {
		const response = await this.client.fetch<ImmichSearchResponse>('/search/metadata', {
			method: 'POST',
			body: JSON.stringify({city, size: SEARCH_PAGE_SIZE}),
		});
		return this.searchItemsToAssets(response);
	}

	private searchItemsToAssets(response: ImmichSearchResponse): TimelineAsset[] {
		const items = response.assets?.items;
		if (!Array.isArray(items)) return [];
		return items
			// Search returns hidden assets (live-photo companion videos) whose thumbnails 404
			.filter((a) => a.visibility !== 'hidden' && a.visibility !== 'locked')
			.map((a) => this.assetFromImmichAsset(a));
	}

	public thumbnailUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'thumbnail');
	}

	public previewUrl(assetId: string): string {
		return this.client.getThumbnailUrl(assetId, 'preview');
	}

	public videoPlaybackUrl(assetId: string): string {
		return this.client.getVideoPlaybackUrl(assetId);
	}

	public faceUrl(personId: string): string {
		return this.client.getFaceThumbnailUrl(personId);
	}
}

export async function validateAuth(client: APIClient): Promise<boolean> {
	try {
		await client.fetch('/users/me');
		return true;
	} catch (error) {
		if (error instanceof APIError && error.status === 401) return false;
		throw error;
	}
}
