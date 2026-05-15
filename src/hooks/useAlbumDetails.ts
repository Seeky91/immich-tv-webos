import {useRepositoryQuery} from './queryConfig';

export const useAlbumDetails = (albumId: string) =>
	useRepositoryQuery(['album', albumId], (r) => r.getAlbum(albumId));
