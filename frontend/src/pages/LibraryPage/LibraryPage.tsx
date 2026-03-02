import { useState, useEffect, useCallback } from 'react';
import { useSongRepository } from '../../context/SongRepositoryContext';
import type { SongPage, SongQuery } from '../../data/SongRepository';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { FilterSortBar, type FilterSortValues } from '../../components/FilterSortBar/FilterSortBar';
import { SongCard } from '../../components/SongCard/SongCard';
import { ConnectionError } from '../../components/ConnectionError/ConnectionError';
import styles from './LibraryPage.module.css';

const PAGE_SIZE = 24;

const DEFAULT_FILTERS: FilterSortValues = {
  genre: '',
  language: '',
  favorite: false,
  sortBy: 'title',
  sortOrder: 'asc',
};

export function LibraryPage() {
  const repo = useSongRepository();
  const [songPage, setSongPage] = useState<SongPage | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterSortValues>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [genres, setGenres] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    repo.getGenres().then(setGenres).catch(() => {});
    repo.getLanguages().then(setLanguages).catch(() => {});
  }, [repo]);

  const fetchSongs = useCallback(() => {
    setLoading(true);
    setError(null);

    const query: SongQuery = {
      page,
      size: PAGE_SIZE,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };

    if (search.trim()) query.search = search.trim();
    if (filters.genre) query.genre = filters.genre;
    if (filters.language) query.language = filters.language;
    if (filters.favorite) query.favorite = true;

    repo
      .getSongs(query)
      .then(setSongPage)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repo, search, filters, page]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Reset to first page when search or filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const handleFiltersChange = useCallback((values: FilterSortValues) => {
    setFilters(values);
    setPage(0);
  }, []);

  if (loading && !songPage) return <div className={styles.status}>Loading songs...</div>;
  if (error) return <ConnectionError message={error} onRetry={fetchSongs} />;

  const totalPages = songPage?.totalPages ?? 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Song Library</h1>
      <div className={styles.controls}>
        <SearchBar value={search} onChange={handleSearchChange} />
        <FilterSortBar
          genres={genres}
          languages={languages}
          values={filters}
          onChange={handleFiltersChange}
        />
      </div>
      {!songPage || songPage.content.length === 0 ? (
        <div className={styles.status}>No songs found.</div>
      ) : (
        <>
          <div className={styles.grid}>
            {songPage.content.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                &larr; Prev
              </button>
              <span className={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className={styles.pageButton}
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
