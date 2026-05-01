import React, {createContext, useContext} from 'react';
import type {PhotoRepository} from './PhotoRepository';

const RepositoryContext = createContext<PhotoRepository | null>(null);

interface ProviderProps {
	repository: PhotoRepository;
	children: React.ReactNode;
}

export const RepositoryProvider: React.FC<ProviderProps> = ({repository, children}) => (
	<RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>
);

export function useRepository(): PhotoRepository {
	const repo = useContext(RepositoryContext);
	if (!repo) throw new Error('useRepository must be used within a RepositoryProvider');
	return repo;
}
