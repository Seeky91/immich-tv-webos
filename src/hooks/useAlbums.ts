import {useQuery} from '@tanstack/react-query';
import type {ImmichAPI} from '../api/immich';
import {ASSETS_QUERY_CONFIG} from './queryConfig';

export const useAlbums = (api: ImmichAPI) =>
	useQuery({
		queryKey: ['albums'],
		queryFn: () => api.getAlbums(),
		...ASSETS_QUERY_CONFIG,
	});
