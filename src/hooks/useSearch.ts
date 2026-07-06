import {useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {ASSETS_QUERY_CONFIG} from './queryConfig';
import {useRepository} from '../domain/RepositoryContext';
import {groupAssetsByDay} from '../domain/transforms';
import type {DayGroup} from '../domain/types';

export interface SearchQuery {
	type: 'smart' | 'person' | 'city';
	value: string;
}

export const useSearch = (query: SearchQuery | null): {
	groups: DayGroup[];
	isLoading: boolean;
	error: unknown;
} => {
	const repository = useRepository();
	const result = useQuery({
		queryKey: ['search', query?.type, query?.value],
		queryFn: () => {
			if (query!.type === 'smart') return repository.searchSmart(query!.value);
			if (query!.type === 'person') return repository.searchByPerson(query!.value);
			return repository.searchByCity(query!.value);
		},
		enabled: !!query,
		...ASSETS_QUERY_CONFIG,
	});

	const groups = useMemo(() => (result.data ? groupAssetsByDay(result.data) : []), [result.data]);

	return {groups, isLoading: result.isLoading, error: result.error};
};
