import { createContext, useContext, type ReactNode } from 'react';
import type { SongRepository } from '../data/SongRepository';

const SongRepositoryContext = createContext<SongRepository | null>(null);

export function SongRepositoryProvider({
  repository,
  children,
}: {
  repository: SongRepository;
  children: ReactNode;
}) {
  return (
    <SongRepositoryContext.Provider value={repository}>
      {children}
    </SongRepositoryContext.Provider>
  );
}

export function useSongRepository(): SongRepository {
  const repo = useContext(SongRepositoryContext);
  if (!repo) {
    throw new Error('useSongRepository must be used within a SongRepositoryProvider');
  }
  return repo;
}
