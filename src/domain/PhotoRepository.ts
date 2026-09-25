import type {Album, AlbumDetails, Person, Place, TimelineAsset, TimelineBucket, TimelineScope} from './types';

export interface PhotoRepository {
	getBuckets(scope?: TimelineScope): Promise<TimelineBucket[]>;
	getBucketAssets(timeBucket: string, scope?: TimelineScope, signal?: AbortSignal): Promise<TimelineAsset[]>;

	getAlbums(): Promise<Album[]>;
	getAlbum(albumId: string): Promise<AlbumDetails>;

	getPeople(): Promise<Person[]>;

	getPlaces(): Promise<Place[]>;

	searchSmart(query: string): Promise<TimelineAsset[]>;
	searchByCity(city: string): Promise<TimelineAsset[]>;
	searchRandomImages(scope: TimelineScope, size: number): Promise<TimelineAsset[]>;

	thumbnailUrl(assetId: string): string;
	previewUrl(assetId: string): string;
	videoPlaybackUrl(assetId: string): string;
	faceUrl(personId: string): string;
}
