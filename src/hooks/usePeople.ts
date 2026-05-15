import {useRepositoryQuery} from './queryConfig';

export const usePeople = () => useRepositoryQuery(['people'], (r) => r.getPeople());
