import {useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {ASSETS_QUERY_CONFIG} from './queryConfig';
import type {ImmichAPI} from '../api/immich';
import type {GroupedAsset} from '../api/types';

export interface SearchQuery {
	type: 'smart' | 'person';
	value: string;
}

export const useImmichSearchResults = (api: ImmichAPI | null, query: SearchQuery | null): {
	groups: GroupedAsset[];
	isLoading: boolean;
	error: unknown;
} => {
	const result = useQuery({
		queryKey: ['search', query?.type, query?.value],
		queryFn: () =>
			query!.type === 'smart'
				? api!.searchSmartAssets(query!.value)
				: api!.searchByPerson(query!.value),
		enabled: !!api && !!query,
		...ASSETS_QUERY_CONFIG,
	});

	const groups = useMemo(
		() => (result.data && api ? api.groupAssetsByDay(result.data) : []),
		[result.data, api]
	);

	return {groups, isLoading: result.isLoading, error: result.error};
};
