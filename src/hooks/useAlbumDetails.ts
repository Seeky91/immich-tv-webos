import {useQuery} from '@tanstack/react-query';
import {ASSETS_QUERY_CONFIG} from './queryConfig';
import {useRepository} from '../domain/RepositoryContext';

export const useAlbumDetails = (albumId: string) => {
	const repository = useRepository();
	return useQuery({
		queryKey: ['album', albumId],
		queryFn: () => repository.getAlbum(albumId),
		...ASSETS_QUERY_CONFIG,
	});
};
