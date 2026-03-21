import {useQuery} from '@tanstack/react-query';
import {ASSETS_QUERY_CONFIG} from './queryConfig';
import type {ImmichAPI} from '../api/immich';

export const useImmichPeople = (api: ImmichAPI | null) =>
	useQuery({
		queryKey: ['people'],
		queryFn: () => api!.getPeople(),
		enabled: !!api,
		...ASSETS_QUERY_CONFIG,
	});
