import {useQuery} from '@tanstack/react-query';
import {ASSETS_QUERY_CONFIG} from './queryConfig';
import {useRepository} from '../domain/RepositoryContext';

export const usePeople = () => {
	const repository = useRepository();
	return useQuery({
		queryKey: ['people'],
		queryFn: () => repository.getPeople(),
		...ASSETS_QUERY_CONFIG,
	});
};
