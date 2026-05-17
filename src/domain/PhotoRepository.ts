import type {Album, AlbumDetails, Person, TimelineAsset, TimelineBucket, TimelinePage} from './types';

export interface PhotoRepository {
	getBuckets(): Promise<TimelineBucket[]>;
	getTimelinePage(allBuckets: TimelineBucket[], skip: number, take: number): Promise<TimelinePage>;

	getAlbums(): Promise<Album[]>;
	getAlbum(albumId: string): Promise<AlbumDetails>;

	getPeople(): Promise<Person[]>;

	searchSmart(query: string): Promise<TimelineAsset[]>;
	searchByPerson(personId: string): Promise<TimelineAsset[]>;

	thumbnailUrl(assetId: string): string;
	previewUrl(assetId: string): string;
	originalUrl(assetId: string): string;
	videoPlaybackUrl(assetId: string): string;
	faceUrl(personId: string): string;
}
