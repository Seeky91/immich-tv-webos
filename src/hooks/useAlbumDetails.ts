import {useQuery} from '@tanstack/react-query';
import type {ImmichAPI} from '../api/immich';
import {ASSETS_QUERY_CONFIG} from './queryConfig';

export const useAlbumDetails = (api: ImmichAPI, albumId: string) =>
	useQuery({
		queryKey: ['album', albumId],
		queryFn: () => api.getAlbumDetails(albumId),
		...ASSETS_QUERY_CONFIG,
	});
