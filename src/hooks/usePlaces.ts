import {useRepositoryQuery} from './queryConfig';

export const usePlaces = () => useRepositoryQuery(['places'], (r) => r.getPlaces());
