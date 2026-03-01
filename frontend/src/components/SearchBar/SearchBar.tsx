import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      type="text"
      className={styles.input}
      placeholder="Search by title or artist..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
