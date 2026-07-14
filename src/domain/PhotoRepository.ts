import type {Album, AlbumDetails, Person, Place, TimelineAsset, TimelineBucket} from './types';

export interface PhotoRepository {
	getBuckets(): Promise<TimelineBucket[]>;
	getBucketAssets(timeBucket: string, signal?: AbortSignal): Promise<TimelineAsset[]>;

	getAlbums(): Promise<Album[]>;
	getAlbum(albumId: string): Promise<AlbumDetails>;

	getPeople(): Promise<Person[]>;

	getPlaces(): Promise<Place[]>;

	searchSmart(query: string): Promise<TimelineAsset[]>;
	searchByPerson(personId: string): Promise<TimelineAsset[]>;
	searchByCity(city: string): Promise<TimelineAsset[]>;

	thumbnailUrl(assetId: string): string;
	previewUrl(assetId: string): string;
	videoPlaybackUrl(assetId: string): string;
	faceUrl(personId: string): string;
}
