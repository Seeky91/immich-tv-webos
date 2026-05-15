import {useRepositoryQuery} from './queryConfig';

export const useAlbums = () => useRepositoryQuery(['albums'], (r) => r.getAlbums());
