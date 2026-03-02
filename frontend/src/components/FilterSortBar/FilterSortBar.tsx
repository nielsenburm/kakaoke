import styles from './FilterSortBar.module.css';

export interface FilterSortValues {
  genre: string;
  language: string;
  favorite: boolean;
  sortBy: 'title' | 'artist' | 'year';
  sortOrder: 'asc' | 'desc';
}

interface FilterSortBarProps {
  genres: string[];
  languages: string[];
  values: FilterSortValues;
  onChange: (values: FilterSortValues) => void;
}

export function FilterSortBar({ genres, languages, values, onChange }: FilterSortBarProps) {
  return (
    <div className={styles.bar}>
      <button
        className={`${styles.favoriteToggle} ${values.favorite ? styles.favoriteActive : ''}`}
        onClick={() => onChange({ ...values, favorite: !values.favorite })}
        title={values.favorite ? 'Show all songs' : 'Show favourites only'}
      >
        {values.favorite ? '\u2665' : '\u2661'}
      </button>
      <select
        className={styles.select}
        value={values.genre}
        onChange={(e) => onChange({ ...values, genre: e.target.value })}
      >
        <option value="">All Genres</option>
        {genres.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={values.language}
        onChange={(e) => onChange({ ...values, language: e.target.value })}
      >
        <option value="">All Languages</option>
        {languages.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={`${values.sortBy}-${values.sortOrder}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split('-') as [FilterSortValues['sortBy'], FilterSortValues['sortOrder']];
          onChange({ ...values, sortBy, sortOrder });
        }}
      >
        <option value="title-asc">Title A-Z</option>
        <option value="title-desc">Title Z-A</option>
        <option value="artist-asc">Artist A-Z</option>
        <option value="artist-desc">Artist Z-A</option>
        <option value="year-desc">Newest First</option>
        <option value="year-asc">Oldest First</option>
      </select>
    </div>
  );
}
